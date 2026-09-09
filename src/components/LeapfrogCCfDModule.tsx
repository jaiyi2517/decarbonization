import type { ExtendedExecutiveKPIs, FrontierStep } from '@/lib/decarbonizationEngine';
import { fmtCurrency, fmtNumber } from '@/lib/format';
import { AlertTriangle, Layers, XCircle } from 'lucide-react';

interface LeapfrogCCfDModuleProps {
  kpis: ExtendedExecutiveKPIs;
  frontierSteps: FrontierStep[];
  carbonPrice: number;
}

export function LeapfrogCCfDModule({
  kpis,
  frontierSteps,
  carbonPrice,
}: LeapfrogCCfDModuleProps) {
  const isLeapfrog = kpis.isLeapfrogTriggered;
  const crossesThreshold = carbonPrice >= 141;

  return (
    <div className="space-y-4">
      {/* Leapfrog Warning Banner */}
      {isLeapfrog && crossesThreshold && (
        <div className="flex items-start gap-3 rounded-xl border border-rust-200 bg-rust-50 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rust-100 text-rust-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-rust-700">
              警訊：碳價已達 €{carbonPrice.toFixed(0)}/tCO₂ 臨界值！
            </p>
            <p className="mt-1 text-sm text-rust-600">
              建議避開過渡期 LEILAC 技術，直接越級投資「鈣循環 (Calcium Looping)」以獲取長期最大經濟效益。
            </p>
          </div>
        </div>
      )}

      {/* Leapfrog status (when not triggered) */}
      {!isLeapfrog && (
        <div className="flex items-start gap-3 rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-mist-700">尚未觸發技術越級 (Leapfrog)</p>
            <p className="mt-1 text-sm text-mist-500">
              {kpis.nextLeverMAC !== null
                ? `下一階技術 MAC：€${kpis.nextLeverMAC.toFixed(0)}/tCO₂ — 當前碳價 (€${carbonPrice.toFixed(0)}/tCO₂) 尚未跨越越級臨界點。`
                : '目前無更深層的減碳技術可供選擇。'}
            </p>
          </div>
        </div>
      )}

      {/* CCfD Subsidy Module */}
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-mist-700">碳差價合約 (Carbon Contract for Difference, CCfD)</h3>
            <p className="text-xs text-mist-400">
              邁向淨零所需的最低年度定額補貼金額
            </p>
          </div>
        </div>

        {kpis.ccfdBreakdown.length === 0 ? (
          <p className="text-sm text-mist-400">
            目前無更深層的減碳步驟可供選擇 — 當前最優解已接近或達到最大前緣。
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
              <span className="text-sm font-medium text-indigo-700">年度 CCfD 補貼總需求</span>
              <span className="font-mono text-lg font-bold text-indigo-700">
                €{fmtCurrency(kpis.ccfdSubsidyRequired)}/年
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-mist-400">
                    <th className="px-2 py-1.5 font-medium">更深層技術組合</th>
                    <th className="px-2 py-1.5 text-right font-medium">MAC</th>
                    <th className="px-2 py-1.5 text-right font-medium">Δ減碳量</th>
                    <th className="px-2 py-1.5 text-right font-medium">年度補貼</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.ccfdBreakdown.map((c, i) => (
                    <tr key={i} className="border-t border-mist-100">
                      <td className="px-2 py-1.5 font-medium text-mist-600">
                        [{c.leverIds.join(' + ')}]
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-mist-500">
                        €{c.mac.toFixed(0)}/tCO₂
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-mist-500">
                        {fmtNumber(c.abatementDelta)} tCO₂
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-indigo-600">
                        €{fmtCurrency(c.subsidy)}/年
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Technology Elimination Analysis */}
      <TechnologyElimination frontierSteps={frontierSteps} carbonPrice={carbonPrice} />
    </div>
  );
}

function TechnologyElimination({
  frontierSteps,
  carbonPrice,
}: {
  frontierSteps: FrontierStep[];
  carbonPrice: number;
}) {
  const frontierLeverIds = new Set<string>();
  for (const s of frontierSteps) {
    for (const id of s.activeLeverIds) frontierLeverIds.add(id);
  }

  const eliminatedLevers: { id: string; reason: string; mac: number }[] = [];
  const checked = new Set<string>();

  for (const s of frontierSteps) {
    for (const id of s.activeLeverIds) {
      if (checked.has(id)) continue;
      checked.add(id);
    }
  }

  const allLeverIds = new Set<string>();
  for (const s of frontierSteps) {
    for (const id of s.activeLeverIds) allLeverIds.add(id);
  }

  const leverMaxMAC = new Map<string, number>();
  for (const s of frontierSteps) {
    for (const id of s.activeLeverIds) {
      const current = leverMaxMAC.get(id) ?? 0;
      leverMaxMAC.set(id, Math.max(current, s.marginalAbatementCost));
    }
  }

  for (const [id, mac] of leverMaxMAC) {
    if (mac > carbonPrice * 2 && id === 'AS') {
      eliminatedLevers.push({
        id,
        reason: '變動營運成本 (OPEX) 過高 (€15/噸) — 在所有碳價水準下均被鈣循環 (Calcium Looping) 支配，不具經濟效益。',
        mac,
      });
    }
  }

  if (eliminatedLevers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rust-50 text-rust-500">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-mist-700">技術淘汰分析 (Technology Elimination)</h3>
          <p className="text-xs text-mist-400">被成本有效前緣淘汰之技術</p>
        </div>
      </div>
      <div className="space-y-2">
        {eliminatedLevers.map((l) => (
          <div
            key={l.id}
            className="flex items-start gap-2 rounded-lg bg-rust-50/50 px-3 py-2"
          >
            <span className="rounded bg-rust-100 px-2 py-0.5 font-mono text-xs font-bold text-rust-600">
              {l.id}
            </span>
            <p className="text-sm text-mist-600">{l.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
