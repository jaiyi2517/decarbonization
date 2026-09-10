// =============================================================================
// Decarbonization Cost Calculator — Type Definitions
// Combinatorial MACC (Marginal Abatement Cost Curve) Model
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Plant Baseline Input — 廠房營運與基準參數
//    Describes a plant's status quo before any decarbonization intervention.
// -----------------------------------------------------------------------------

export interface PlantBaselineInput {
  /** Unique plant identifier */
  plantId: string;
  /** Human-readable plant name */
  plantName: string;
  /** E0 — Baseline annual CO₂ emissions (tCO₂/year) */
  E0: number;
  /** q — Total annual product output (units/year) */
  q: number;
  /** w_base — Baseline unit operating cost before abatement levers (currency/unit) */
  w_base: number;
  /** q_clinker — Optional intermediate product output (e.g. clinker tonnes/year, for process-emission ratio) */
  q_clinker?: number;
  /** T — Remaining plant/equipment evaluation period (years, default 25) */
  T: number;
  /** r — Weighted Average Cost of Capital (WACC) discount rate (default 0.05 = 5%) */
  r: number;
}

// -----------------------------------------------------------------------------
// 2. Macro Economic Context — 外部經濟與政策參數
//    External variables that can be adjusted for scenario / sensitivity analysis.
// -----------------------------------------------------------------------------

export interface MacroEconomicContext {
  /** p — Expected external carbon price or carbon tax (currency/tCO₂) */
  carbonPrice: number;
  /** c_TS — CO₂ Transport & Storage (T&S) unit cost (default 80 €/tCO₂ captured) */
  c_TS: number;
  /** A_free — Free government-issued emission allowances (tCO₂/year, default 0) */
  A_free: number;
  /** baseLPC — Levelized Production Cost of conventional product with no abatement (currency/tonne product) */
  baseLPC: number;
}

// -----------------------------------------------------------------------------
// 3. Abatement Levers — 單一與組合減排技術槓桿
// -----------------------------------------------------------------------------

export type LeverType =
  | 'process_optimization'
  | 'raw_material_substitution'
  | 'carbon_capture'
  | 'energy_substitution'
  | 'product_innovation';

/** Elementary (single) abatement lever */
export interface AbatementLever {
  /** Technology code, e.g. OG, AF, RC, CC, LL, CL, OF, AS */
  leverId: string;
  /** Technology name, e.g. "Calcium Looping" */
  leverName: string;
  /** Category of the lever */
  leverType: LeverType;
  /** I — Initial capital expenditure, one-time (currency) */
  capex: number;
  /** w — Variable operating cost per tonne of product (currency/tonne product) */
  varOpex: number;
  /** F — Annual fixed maintenance & operating cost (currency/year) */
  fixedOpex: number;
  /** ΔE — Expected abatement when operating standalone (tCO₂/year) */
  standaloneAbatement: number;
  /** Capture rate for carbon-capture levers (e.g. 0.9 = 90%); undefined for non-capture levers */
  captureRate?: number;
  /** Optional human-readable description of the lever */
  description?: string;
}

/** Interaction type between levers in a combination */
export type InteractionType = 'multiplicative' | 'additive';

/**
 * Interaction matrix entry — describes how two levers interfere when combined.
 * Multiplicative: raw-material substitution reduces clinker output → downstream
 *   capture volume shrinks proportionally.
 * Additive: effects simply add together.
 */
export interface InteractionEntry {
  /** Lever A id */
  leverA: string;
  /** Lever B id */
  leverB: string;
  /** How the two levers interact */
  interactionType: InteractionType;
  /**
   * For 'multiplicative': a scaling factor applied to lever B's abatement
   *   when lever A is also active (e.g. 0.7 means B retains 70% of its effect).
   * For 'additive': typically 1 (no scaling), effects just sum.
   */
  factor: number;
}

/** A feasible combination of levers (a candidate point on the solution space) */
export interface CombinedLever {
  /** Binary vector v⃗ — 1 = lever active, 0 = inactive, indexed to lever list order */
  combinedVector: number[];
  /** Lever ids included in this combination */
  activeLeverIds: string[];
  /** Whether this combination is physically/chemically feasible */
  isFeasible: boolean;
  /** If infeasible, human-readable reason */
  infeasibilityReason?: string;
  /** E(v⃗) — Total residual emissions after considering interactions (tCO₂/year) */
  reducedEmissions: number;
  /** Total abatement = E0 - E(v⃗) (tCO₂/year) */
  totalAbatement: number;
  /** Interaction type that governs this combination */
  interactionType: InteractionType;
}

// -----------------------------------------------------------------------------
// 4. Efficient Frontier & MAC Step — 演算與邊際成本輸出結構
// -----------------------------------------------------------------------------

/** A single step on the Marginal Abatement Cost Curve (the "staircase") */
export interface MACStep {
  /** Binary vector v⃗ for this step */
  combinedVector: number[];
  /** Cumulative abatement at this step (tCO₂/year) */
  totalAbatement: number;
  /** Abatement as percentage of E0 (%) */
  abatementPercentage: number;
  /**
   * DE — Total discounted lifecycle expenditure (currency).
   *   DE = I + Σ_{t=1..T} (F + w·q + c_TS·ΔE_cap) / (1+r)^t
   *   where ΔE_cap is captured CO₂ requiring T&S.
   */
  totalDiscountedExpenditure: number;
  /**
   * TAC — Total abatement cost vs. baseline E0 (currency).
   *   TAC = DE − (carbonPrice × abatement × T_discounted)  [net of carbon savings]
   *   Or simply DE when carbon-price savings are reported separately.
   */
  totalAbatementCost: number;
  /**
   * MAC — Marginal abatement cost (currency/tCO₂).
   *   MAC = ΔTAC / ΔAbatement between consecutive steps on the frontier.
   */
  marginalAbatementCost: number;
  /** Whether this point lies on the cost-efficient frontier */
  isCostEfficient: boolean;
  /** Lever ids active at this step */
  activeLeverIds: string[];
}

/** The full efficient-frontier result set */
export interface EfficientFrontierResult {
  /** All evaluated feasible combinations */
  allCombinations: CombinedLever[];
  /** Only the cost-efficient frontier points, sorted by ascending abatement */
  efficientFrontier: MACStep[];
  /** All MAC steps (including dominated points), sorted by ascending abatement */
  allSteps: MACStep[];
}

// -----------------------------------------------------------------------------
// 5. Executive KPIs — 商業決策與高管 KPI 結構
//    Top-level decision metrics for CEO/CFO consumption.
// -----------------------------------------------------------------------------

export interface ExecutiveKPIs {
  /** Optimal lever combination at the current carbon price p */
  optimalLeverVector: number[];
  /** Lever ids in the optimal combination */
  optimalLeverIds: string[];
  /** Optimal self-abatement volume (tCO₂/year) */
  optimalAbatement: number;
  /** Optimal abatement as percentage of E0 (%) */
  optimalAbatementPercentage: number;
  /**
   * Avoided carbon tax (currency/year).
   *   = carbonPrice × min(abatement, A_free gap) — the penalty no longer paid.
   */
  avoidedCarbonTax: number;
  /**
   * Green premium ΔLPC — added levelized production cost (currency/tonne product).
   *   ΔLPC = (DE_annualized) / q  where DE_annualized = DE × CRF(r, T).
   *   Also expressed as a percentage of baseLPC.
   */
  greenPremium: number;
  /** Green premium as percentage of baseLPC (%) */
  greenPremiumPercentage: number;
  /**
   * CCfD subsidy required — minimum annual fixed subsidy to push deeper
   *   abatement (currency/year). Bridges the gap between MAC and carbon price
   *   for levers whose MAC > carbonPrice.
   */
  ccfdSubsidyRequired: number;
  /** Whether "leapfrogging" is triggered — skip intermediate levers to jump to deep abatement */
  isLeapfrogTriggered: boolean;
  /** The MAC of the next (deeper) lever beyond optimal, for leapfrog comparison */
  nextLeverMAC: number | null;
}

// -----------------------------------------------------------------------------
// Calculation request — bundles all inputs for a single optimization run
// -----------------------------------------------------------------------------

export interface CalculationRequest {
  plant: PlantBaselineInput;
  macro: MacroEconomicContext;
  levers: AbatementLever[];
  interactions: InteractionEntry[];
}

/** Full result of a calculation run */
export interface CalculationResult {
  frontier: EfficientFrontierResult;
  kpis: ExecutiveKPIs;
}
