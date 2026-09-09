// =============================================================================
// Decarbonization Calculation Engine Core
// Pure, UI-independent algorithms for the Combinatorial MACC Model.
// =============================================================================

import type {
  AbatementLever,
  CalculationRequest,
  CalculationResult,
  CombinedLever,
  EfficientFrontierResult,
  ExecutiveKPIs,
  InteractionEntry,
  MACStep,
  PlantBaselineInput,
  MacroEconomicContext,
} from '@/types/decarbonization';

// ---------------------------------------------------------------------------
// Financial helpers
// ---------------------------------------------------------------------------

/**
 * Annuity Factor A(r, T) = (1 - (1+r)^{-T}) / r
 * Gives the present value of a 1-unit-per-year annuity over T years at rate r.
 */
export function annuityFactor(r: number, T: number): number {
  if (r === 0) return T;
  return (1 - Math.pow(1 + r, -T)) / r;
}

/**
 * Capital Recovery Factor CRF(r, T) = 1 / A(r, T)
 * Converts a present-value amount into an equal annual installment.
 */
export function crf(r: number, T: number): number {
  return 1 / annuityFactor(r, T);
}

// ---------------------------------------------------------------------------
// 1. Discounted Expenditure — calculateDE
//    DE(v⃗) = I(v⃗) + Σ_{t=1..T} [ w_t(v⃗)·q + F_t(v⃗) ] · (1+r)^{-t}
//    w_t(v⃗) = w_base + Δw_tech(v⃗) + c_TS · (E_captured(v⃗) / q)
// ---------------------------------------------------------------------------

export interface DEResult {
  /** Total discounted expenditure (currency) */
  DE: number;
  /** Total capex (one-time, currency) */
  capex: number;
  /** Annual variable opex including T&S (currency/year) */
  annualVarOpex: number;
  /** Annual fixed opex (currency/year) */
  annualFixedOpex: number;
  /** CO₂ captured requiring T&S (tCO₂/year) */
  capturedCO2: number;
  /** Effective per-tonne variable cost w_t (currency/tonne) */
  effectiveVarOpexPerTonne: number;
}

export function calculateDE(
  vector: number[],
  levers: AbatementLever[],
  plant: PlantBaselineInput,
  macro: MacroEconomicContext,
  capturedCO2: number,
): DEResult {
  const { q, T, r } = plant;
  const { c_TS } = macro;

  let totalCapex = 0;
  let totalFixedOpex = 0;
  let totalVarOpexPerTonne = 0;

  for (let i = 0; i < levers.length; i++) {
    if (vector[i] === 1) {
      const lever = levers[i];
      totalCapex += lever.capex;
      totalFixedOpex += lever.fixedOpex;
      totalVarOpexPerTonne += lever.varOpex;
    }
  }

  // w_t(v⃗) = Δw_tech + c_TS · (E_captured / q)
  const tsCostPerTonne = q > 0 ? (c_TS * capturedCO2) / q : 0;
  const effectiveVarOpexPerTonne = totalVarOpexPerTonne + tsCostPerTonne;

  const annualVarOpex = effectiveVarOpexPerTonne * q;
  const annualOperating = annualVarOpex + totalFixedOpex;

  // DE = I + annualOperating × A(r, T)
  const pvOps = annualOperating * annuityFactor(r, T);
  const DE = totalCapex + pvOps;

  return {
    DE,
    capex: totalCapex,
    annualVarOpex,
    annualFixedOpex: totalFixedOpex,
    capturedCO2,
    effectiveVarOpexPerTonne,
  };
}

// ---------------------------------------------------------------------------
// 2. Emissions with Interaction Effects — calculateEmissions
//    Front-stage levers reduce E_generated; capture levers operate on the
//    reduced E_generated (multiplicative interaction).
//    E(v⃗) = E_generated - E_captured
// ---------------------------------------------------------------------------

export interface EmissionsResult {
  /** E_generated — emissions after front-stage reduction, before capture */
  E_generated: number;
  /** E_captured — CO₂ captured by capture levers (tCO₂/year) */
  E_captured: number;
  /** E(v⃗) — final residual emissions (tCO₂/year) */
  E_v: number;
  /** Total abatement = E0 - E(v⃗) */
  totalAbatement: number;
  /** Whether multiplicative interaction was applied */
  hasMultiplicativeInteraction: boolean;
}

export function calculateEmissions(
  vector: number[],
  levers: AbatementLever[],
  plant: PlantBaselineInput,
  interactions: InteractionEntry[],
): EmissionsResult {
  const { E0 } = plant;

  // Partition levers into front-stage (reduce E_generated) and capture (reduce from E_generated)
  let frontStageAbatement = 0;
  let captureLevers: AbatementLever[] = [];

  for (let i = 0; i < levers.length; i++) {
    if (vector[i] !== 1) continue;
    const lever = levers[i];
    if (lever.leverType === 'carbon_capture') {
      captureLevers.push(lever);
    } else {
      frontStageAbatement += lever.standaloneAbatement;
    }
  }

  // E_generated = E0 - front-stage abatement (floored at 0)
  const E_generated = Math.max(0, E0 - frontStageAbatement);

  // Apply multiplicative interactions: front-stage levers scale capture
  // Capture is computed on the REDUCED E_generated, not original E0
  let E_captured = 0;
  let hasMultiplicative = false;

  for (const captureLever of captureLevers) {
    let captureBase = E_generated;
    let captureRate = captureLever.captureRate ?? 0.9;

    // Check interactions: front-stage levers may scale the capture lever's base
    for (const inter of interactions) {
      if (inter.interactionType !== 'multiplicative') continue;
      if (inter.leverB !== captureLever.leverId) continue;

      const aIdx = levers.findIndex((l) => l.leverId === inter.leverA);
      if (aIdx >= 0 && vector[aIdx] === 1) {
        // The front-stage lever reduces E_generated, which already reduces capture.
        // Additional factor accounts for process-level interference.
        captureBase *= inter.factor;
        hasMultiplicative = true;
      }
    }

    E_captured += captureBase * captureRate;
  }

  // E(v⃗) = E_generated - E_captured
  const E_v = Math.max(0, E_generated - E_captured);
  const totalAbatement = E0 - E_v;

  return {
    E_generated,
    E_captured,
    E_v,
    totalAbatement,
    hasMultiplicativeInteraction: hasMultiplicative,
  };
}

// ---------------------------------------------------------------------------
// 3. Cost-Efficient Frontier — buildCostEfficientFrontier
//    TAC(E|E0) = DE(v⃗) - DE(v0)   (incremental cost vs. do-nothing baseline)
//    Pareto filter: remove dominated points (higher cost, lower abatement)
//    MAC(Ei) = [ (TAC(Ei) - TAC(Ei-1)) / A(r,T) ] / (Ei-1 - Ei)
// ---------------------------------------------------------------------------

/** Enumerate all 2^n binary vectors */
function enumerateVectors(n: number): number[][] {
  const total = 1 << n;
  const vectors: number[][] = [];
  for (let mask = 0; mask < total; mask++) {
    const v: number[] = [];
    for (let i = 0; i < n; i++) v.push((mask >> i) & 1);
    vectors.push(v);
  }
  return vectors;
}

/** Check feasibility: at most one carbon-capture lever active */
function checkFeasibility(
  vector: number[],
  levers: AbatementLever[],
): { feasible: boolean; reason?: string } {
  const activeCC = levers.filter(
    (l, i) => vector[i] === 1 && l.leverType === 'carbon_capture',
  );
  if (activeCC.length > 1) {
    return {
      feasible: false,
      reason: `Multiple CC levers: ${activeCC.map((l) => l.leverId).join(', ')}`,
    };
  }
  return { feasible: true };
}

export interface FrontierStep extends MACStep {
  /** TAC — incremental cost vs. baseline (currency) */
  TAC: number;
  /** Annualized TAC (currency/year) */
  annualizedTAC: number;
  /** Capex portion (currency) */
  capex: number;
  /** PV of opex portion (currency) */
  pvOpex: number;
  /** Captured CO₂ (tCO₂/year) */
  capturedCO2: number;
  /** E(v⃗) residual emissions */
  residualEmissions: number;
}

export function buildCostEfficientFrontier(
  req: CalculationRequest,
): EfficientFrontierResult & { frontierSteps: FrontierStep[] } {
  const { plant, macro, levers, interactions } = req;
  const { E0, r, T } = plant;
  const n = levers.length;
  const vectors = enumerateVectors(n);
  const af = annuityFactor(r, T);

  // Compute DE for baseline (v0 = all zeros)
  const baselineDE = calculateDE(
    new Array(n).fill(0),
    levers,
    plant,
    macro,
    0,
  ).DE;

  // Evaluate all combinations
  const allCombinations: CombinedLever[] = [];
  const allSteps: (MACStep & FrontierStep)[] = [];

  for (const v of vectors) {
    const emissions = calculateEmissions(v, levers, plant, interactions);
    const { feasible, reason } = checkFeasibility(v, levers);
    const activeLeverIds: string[] = [];
    for (let i = 0; i < n; i++) {
      if (v[i] === 1) activeLeverIds.push(levers[i].leverId);
    }

    allCombinations.push({
      combinedVector: v,
      activeLeverIds,
      isFeasible: feasible,
      infeasibilityReason: reason,
      reducedEmissions: emissions.E_v,
      totalAbatement: emissions.totalAbatement,
      interactionType: emissions.hasMultiplicativeInteraction
        ? 'multiplicative'
        : 'additive',
    });

    if (!feasible) continue;

    const deResult = calculateDE(v, levers, plant, macro, emissions.E_captured);
    const TAC = deResult.DE - baselineDE;
    const annualizedTAC = TAC / af;

    allSteps.push({
      combinedVector: v,
      totalAbatement: emissions.totalAbatement,
      abatementPercentage: (emissions.totalAbatement / E0) * 100,
      totalDiscountedExpenditure: deResult.DE,
      totalAbatementCost: TAC,
      marginalAbatementCost: 0,
      isCostEfficient: false,
      activeLeverIds,
      TAC,
      annualizedTAC,
      capex: deResult.capex,
      pvOpex: deResult.DE - deResult.capex,
      capturedCO2: emissions.E_captured,
      residualEmissions: emissions.E_v,
    });
  }

  // Sort by ascending abatement
  allSteps.sort((a, b) => a.totalAbatement - b.totalAbatement);

  // Pareto filter: keep only non-dominated points
  // A point is dominated if another point has >= abatement and <= TAC (strictly better in at least one)
  const pareto: (MACStep & FrontierStep)[] = [];
  for (const step of allSteps) {
    let dominated = false;
    for (const other of allSteps) {
      if (other === step) continue;
      if (
        other.totalAbatement >= step.totalAbatement &&
        other.TAC <= step.TAC &&
        (other.totalAbatement > step.totalAbatement || other.TAC < step.TAC)
      ) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      step.isCostEfficient = true;
      pareto.push(step);
    }
  }

  // Sort Pareto front by ascending abatement
  pareto.sort((a, b) => a.totalAbatement - b.totalAbatement);

  // Compute MAC between consecutive Pareto points
  // MAC(Ei) = [ (TAC(Ei) - TAC(Ei-1)) / A(r,T) ] / (Ei-1 - Ei)
  // Note: Ei-1 > Ei in emissions terms, but abatement increases, so:
  // MAC = [ ΔTAC_annualized ] / ΔAbatement
  for (let i = 0; i < pareto.length; i++) {
    if (i === 0) {
      pareto[i].marginalAbatementCost =
        pareto[i].totalAbatement > 0
          ? pareto[i].annualizedTAC / pareto[i].totalAbatement
          : 0;
    } else {
      const deltaAnnualTAC = pareto[i].annualizedTAC - pareto[i - 1].annualizedTAC;
      const deltaAbatement = pareto[i].totalAbatement - pareto[i - 1].totalAbatement;
      pareto[i].marginalAbatementCost =
        deltaAbatement > 0 ? deltaAnnualTAC / deltaAbatement : 0;
    }
  }

  // Build the EfficientFrontierResult
  const efficientFrontier: MACStep[] = pareto.map((s) => ({
    combinedVector: s.combinedVector,
    totalAbatement: s.totalAbatement,
    abatementPercentage: s.abatementPercentage,
    totalDiscountedExpenditure: s.totalDiscountedExpenditure,
    totalAbatementCost: s.totalAbatementCost,
    marginalAbatementCost: s.marginalAbatementCost,
    isCostEfficient: true,
    activeLeverIds: s.activeLeverIds,
  }));

  const allMACSteps: MACStep[] = allSteps.map((s) => ({
    combinedVector: s.combinedVector,
    totalAbatement: s.totalAbatement,
    abatementPercentage: s.abatementPercentage,
    totalDiscountedExpenditure: s.totalDiscountedExpenditure,
    totalAbatementCost: s.totalAbatementCost,
    marginalAbatementCost: s.marginalAbatementCost,
    isCostEfficient: s.isCostEfficient,
    activeLeverIds: s.activeLeverIds,
  }));

  return {
    allCombinations,
    efficientFrontier,
    allSteps: allMACSteps,
    frontierSteps: pareto,
  };
}

// ---------------------------------------------------------------------------
// 4. Optimal Abatement Solver — solveOptimalAbatement
//    Z(E, p) = TAC(E|E0) + p × max(0, E - A_free) × A(r, T)
//    Minimize Z over all frontier points to find E* and v⃗*.
// ---------------------------------------------------------------------------

export interface OptimalSolution {
  /** Optimal lever vector */
  optimalVector: number[];
  /** Optimal lever ids */
  optimalLeverIds: string[];
  /** Optimal residual emissions E* (tCO₂/year) */
  optimalEmissions: number;
  /** Optimal abatement (tCO₂/year) */
  optimalAbatement: number;
  /** Optimal abatement percentage (%) */
  optimalAbatementPercentage: number;
  /** Total financial burden Z(E*, p) (currency) */
  totalFinancialBurden: number;
  /** TAC at optimal (currency) */
  TAC: number;
  /** Carbon tax liability at optimal (currency, PV) */
  carbonTaxPV: number;
  /** Annual carbon tax liability (currency/year) */
  annualCarbonTax: number;
  /** The frontier step that was selected */
  selectedStep: FrontierStep;
}

export function solveOptimalAbatement(
  req: CalculationRequest,
  frontierSteps: FrontierStep[],
): OptimalSolution {
  const { plant, macro } = req;
  const { E0, r, T } = plant;
  const { carbonPrice: p, A_free } = macro;
  const af = annuityFactor(r, T);

  let best: OptimalSolution | null = null;
  let minZ = Infinity;

  for (const step of frontierSteps) {
    const E = step.residualEmissions;
    // Carbon tax liability: p × max(0, E - A_free) per year, then PV
    const annualTax = p * Math.max(0, E - A_free);
    const taxPV = annualTax * af;

    // Z(E, p) = TAC + p × max(0, E - A_free) × A(r, T)
    const Z = step.TAC + taxPV;

    if (Z < minZ) {
      minZ = Z;
      best = {
        optimalVector: step.combinedVector,
        optimalLeverIds: step.activeLeverIds,
        optimalEmissions: E,
        optimalAbatement: step.totalAbatement,
        optimalAbatementPercentage: step.abatementPercentage,
        totalFinancialBurden: Z,
        TAC: step.TAC,
        carbonTaxPV: taxPV,
        annualCarbonTax: annualTax,
        selectedStep: step,
      };
    }
  }

  if (!best) {
    // Fallback: zero abatement
    const zeroStep = frontierSteps[0];
    const E = zeroStep?.residualEmissions ?? E0;
    const annualTax = p * Math.max(0, E - A_free);
    best = {
      optimalVector: zeroStep?.combinedVector ?? [],
      optimalLeverIds: zeroStep?.activeLeverIds ?? [],
      optimalEmissions: E,
      optimalAbatement: zeroStep?.totalAbatement ?? 0,
      optimalAbatementPercentage: zeroStep?.abatementPercentage ?? 0,
      totalFinancialBurden: (zeroStep?.TAC ?? 0) + annualTax * af,
      TAC: zeroStep?.TAC ?? 0,
      carbonTaxPV: annualTax * af,
      annualCarbonTax: annualTax,
      selectedStep: zeroStep,
    };
  }

  return best;
}

// ---------------------------------------------------------------------------
// 5. Executive KPIs — calculateExecutiveKPIs
//    Green premium, CCfD subsidy, leapfrog detection.
// ---------------------------------------------------------------------------

export interface ExtendedExecutiveKPIs extends ExecutiveKPIs {
  /** Annualized TAC at optimal (currency/year) */
  annualizedTAC: number;
  /** Total capex at optimal (currency) */
  totalCapex: number;
  /** Total PV opex at optimal (currency) */
  totalPvOpex: number;
  /** CAPEX share of total DE (%) */
  capexShare: number;
  /** OPEX share of total DE (%) */
  opexShare: number;
  /** CCfD breakdown: per-step subsidies for deeper abatement */
  ccfdBreakdown: { leverIds: string[]; mac: number; subsidy: number; abatementDelta: number }[];
  /** E* — optimal residual emissions */
  optimalEmissions: number;
  /** Total financial burden Z(E*, p) */
  totalFinancialBurden: number;
  /** Annual carbon tax at optimal */
  annualCarbonTax: number;
}

export function calculateExecutiveKPIs(
  req: CalculationRequest,
  frontierSteps: FrontierStep[],
  optimal: OptimalSolution,
): ExtendedExecutiveKPIs {
  const { plant, macro } = req;
  const { q, r, T, E0 } = plant;
  const { carbonPrice: p, baseLPC, A_free } = macro;
  const af = annuityFactor(r, T);

  // Green premium: ΔLPC = [ TAC(E*|E0) / A(r,T) ] / q
  const annualizedTAC = optimal.TAC / af;
  const greenPremium = q > 0 ? annualizedTAC / q : 0;
  const greenPremiumPercentage = baseLPC > 0 ? (greenPremium / baseLPC) * 100 : 0;

  // Avoided carbon tax: the tax no longer paid due to abatement
  // = p × min(optimalAbatement, E0 - A_free) — annual
  const taxableBaseline = Math.max(0, E0 - A_free);
  const avoidedCarbonTax = p * Math.min(optimal.optimalAbatement, taxableBaseline);

  // CCfD: for each frontier step beyond optimal, compute the annual subsidy
  // needed to bridge the gap between MAC and carbon price
  const ccfdBreakdown: { leverIds: string[]; mac: number; subsidy: number; abatementDelta: number }[] = [];
  let ccfdSubsidyRequired = 0;

  const optimalIdx = frontierSteps.findIndex((s) => s === optimal.selectedStep);
  for (let i = optimalIdx + 1; i < frontierSteps.length; i++) {
    const step = frontierSteps[i];
    const prevStep = frontierSteps[i - 1];
    const mac = step.marginalAbatementCost;
    const deltaAbatement = step.totalAbatement - (prevStep?.totalAbatement ?? 0);
    const gap = Math.max(0, mac - p);
    const subsidy = gap * deltaAbatement; // annual subsidy for this step
    ccfdSubsidyRequired += subsidy;
    ccfdBreakdown.push({
      leverIds: step.activeLeverIds,
      mac,
      subsidy,
      abatementDelta: deltaAbatement,
    });
  }

  // Leapfrog detection: if the MAC sequence is non-monotonic beyond optimal
  // (a deeper step has lower MAC than an intermediate step), leapfrog is triggered.
  // Also check if carbon price crosses a threshold (e.g. €141) causing a jump
  let isLeapfrogTriggered = false;
  let nextLeverMAC: number | null = null;

  if (optimalIdx >= 0 && optimalIdx + 1 < frontierSteps.length) {
    const nextStep = frontierSteps[optimalIdx + 1];
    nextLeverMAC = nextStep.marginalAbatementCost;

    // Check for non-monotonic MAC: a further step has lower MAC than the next step
    for (let i = optimalIdx + 2; i < frontierSteps.length; i++) {
      if (frontierSteps[i].marginalAbatementCost < nextStep.marginalAbatementCost) {
        isLeapfrogTriggered = true;
        break;
      }
    }

    // Also trigger if carbon price crosses the next step's MAC threshold
    // and the step after that has a lower MAC (skip intermediate)
    if (!isLeapfrogTriggered && p >= nextStep.marginalAbatementCost) {
      for (let i = optimalIdx + 2; i < frontierSteps.length; i++) {
        if (frontierSteps[i].marginalAbatementCost < nextStep.marginalAbatementCost) {
          isLeapfrogTriggered = true;
          break;
        }
      }
    }
  }

  // CAPEX vs OPEX breakdown
  const totalDE = optimal.selectedStep.totalDiscountedExpenditure;
  const totalCapex = optimal.selectedStep.capex;
  const totalPvOpex = optimal.selectedStep.pvOpex;
  const capexShare = totalDE > 0 ? (totalCapex / totalDE) * 100 : 0;
  const opexShare = totalDE > 0 ? (totalPvOpex / totalDE) * 100 : 0;

  return {
    optimalLeverVector: optimal.optimalVector,
    optimalLeverIds: optimal.optimalLeverIds,
    optimalAbatement: optimal.optimalAbatement,
    optimalAbatementPercentage: optimal.optimalAbatementPercentage,
    avoidedCarbonTax,
    greenPremium,
    greenPremiumPercentage,
    ccfdSubsidyRequired,
    isLeapfrogTriggered,
    nextLeverMAC,
    // Extended fields
    annualizedTAC,
    totalCapex,
    totalPvOpex,
    capexShare,
    opexShare,
    ccfdBreakdown,
    optimalEmissions: optimal.optimalEmissions,
    totalFinancialBurden: optimal.totalFinancialBurden,
    annualCarbonTax: optimal.annualCarbonTax,
  };
}

// ---------------------------------------------------------------------------
// Master entry point — runFullCalculation
// ---------------------------------------------------------------------------

export interface FullCalculationResult extends CalculationResult {
  frontierSteps: FrontierStep[];
  optimal: OptimalSolution;
  extendedKPIs: ExtendedExecutiveKPIs;
}

export function runFullCalculation(req: CalculationRequest): FullCalculationResult {
  const frontierResult = buildCostEfficientFrontier(req);
  const optimal = solveOptimalAbatement(req, frontierResult.frontierSteps);
  const extendedKPIs = calculateExecutiveKPIs(req, frontierResult.frontierSteps, optimal);

  return {
    frontier: {
      allCombinations: frontierResult.allCombinations,
      efficientFrontier: frontierResult.efficientFrontier,
      allSteps: frontierResult.allSteps,
    },
    kpis: {
      optimalLeverVector: extendedKPIs.optimalLeverVector,
      optimalLeverIds: extendedKPIs.optimalLeverIds,
      optimalAbatement: extendedKPIs.optimalAbatement,
      optimalAbatementPercentage: extendedKPIs.optimalAbatementPercentage,
      avoidedCarbonTax: extendedKPIs.avoidedCarbonTax,
      greenPremium: extendedKPIs.greenPremium,
      greenPremiumPercentage: extendedKPIs.greenPremiumPercentage,
      ccfdSubsidyRequired: extendedKPIs.ccfdSubsidyRequired,
      isLeapfrogTriggered: extendedKPIs.isLeapfrogTriggered,
      nextLeverMAC: extendedKPIs.nextLeverMAC,
    },
    frontierSteps: frontierResult.frontierSteps,
    optimal,
    extendedKPIs,
  };
}

// ---------------------------------------------------------------------------
// Default scenario data — European reference cement plant
// ---------------------------------------------------------------------------

export interface PlantTemplate {
  label: string;
  plant: PlantBaselineInput;
  levers: AbatementLever[];
  interactions: InteractionEntry[];
}

export const plantTemplates: PlantTemplate[] = [
  {
    label: '基準歐洲水泥廠 (138 萬噸/年)',
    plant: {
      plantId: 'EU-CEM-01',
      plantName: '基準歐洲水泥廠',
      E0: 1_380_000 * 0.65, // ~897,000 tCO₂/yr (clinker ratio ~0.65)
      q: 1_380_000,
      q_clinker: 1_200_000,
      T: 25,
      r: 0.05,
    },
    levers: [
      {
        leverId: 'OG',
        leverName: '製程優化 (Operational Optimization)',
        leverType: 'process_optimization',
        capex: 3_000_000,
        varOpex: 0.3,
        fixedOpex: 150_000,
        standaloneAbatement: 25_000,
      },
      {
        leverId: 'AF',
        leverName: '替代燃料 (Alternative Fuels)',
        leverType: 'raw_material_substitution',
        capex: 12_000_000,
        varOpex: 1.5,
        fixedOpex: 400_000,
        standaloneAbatement: 80_000,
      },
      {
        leverId: 'RC',
        leverName: '降低熟料比例 (Reduced Clinker Ratio)',
        leverType: 'raw_material_substitution',
        capex: 6_000_000,
        varOpex: 1.0,
        fixedOpex: 250_000,
        standaloneAbatement: 120_000,
      },
      {
        leverId: 'LL',
        leverName: 'LEILAC 直接煅燒 (Direct Calcination)',
        leverType: 'carbon_capture',
        capex: 65_000_000,
        varOpex: 5.0,
        fixedOpex: 2_500_000,
        standaloneAbatement: 450_000,
        captureRate: 0.85,
      },
      {
        leverId: 'CL',
        leverName: '鈣循環 (Calcium Looping)',
        leverType: 'carbon_capture',
        capex: 85_000_000,
        varOpex: 7.0,
        fixedOpex: 3_500_000,
        standaloneAbatement: 600_000,
        captureRate: 0.9,
      },
      {
        leverId: 'AS',
        leverName: '胺吸附 (Amine Scrubbing)',
        leverType: 'carbon_capture',
        capex: 110_000_000,
        varOpex: 15.0,
        fixedOpex: 5_000_000,
        standaloneAbatement: 650_000,
        captureRate: 0.9,
      },
    ],
    interactions: [
      { leverA: 'RC', leverB: 'LL', interactionType: 'multiplicative', factor: 0.8 },
      { leverA: 'RC', leverB: 'CL', interactionType: 'multiplicative', factor: 0.75 },
      { leverA: 'RC', leverB: 'AS', interactionType: 'multiplicative', factor: 0.78 },
      { leverA: 'AF', leverB: 'LL', interactionType: 'multiplicative', factor: 0.9 },
      { leverA: 'AF', leverB: 'CL', interactionType: 'multiplicative', factor: 0.92 },
    ],
  },
  {
    label: '自訂工廠',
    plant: {
      plantId: 'CUSTOM',
      plantName: '自訂工廠',
      E0: 500_000,
      q: 1_000_000,
      q_clinker: 800_000,
      T: 25,
      r: 0.05,
    },
    levers: [
      {
        leverId: 'OG',
        leverName: '製程優化 (Operational Optimization)',
        leverType: 'process_optimization',
        capex: 5_000_000,
        varOpex: 0.5,
        fixedOpex: 200_000,
        standaloneAbatement: 15_000,
      },
      {
        leverId: 'AF',
        leverName: '替代燃料 (Alternative Fuels)',
        leverType: 'raw_material_substitution',
        capex: 15_000_000,
        varOpex: 2.0,
        fixedOpex: 500_000,
        standaloneAbatement: 45_000,
      },
      {
        leverId: 'CL',
        leverName: '鈣循環 (Calcium Looping)',
        leverType: 'carbon_capture',
        capex: 80_000_000,
        varOpex: 8.0,
        fixedOpex: 3_000_000,
        standaloneAbatement: 120_000,
        captureRate: 0.9,
      },
    ],
    interactions: [
      { leverA: 'AF', leverB: 'CL', interactionType: 'multiplicative', factor: 0.9 },
    ],
  },
];

export const defaultMacroContext: MacroEconomicContext = {
  carbonPrice: 85,
  c_TS: 80,
  A_free: 0,
  baseLPC: 65,
};
