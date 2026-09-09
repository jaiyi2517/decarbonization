import type { ExtendedExecutiveKPIs } from '@/lib/decarbonizationEngine';
import { fmtCurrency, fmtNumber, fmtPct } from '@/lib/format';
import {
  TrendingDown,
  ShieldCheck,
  Coins,
  Layers,
  PieChart,
  Zap,
} from 'lucide-react';

interface ExecutiveKPICardsProps {
  kpis: ExtendedExecutiveKPIs;
}

export function ExecutiveKPICards({ kpis }: ExecutiveKPICardsProps) {
  const cards = [
    {
      label: '最優自發減碳幅度',
      value: `${fmtPct(kpis.optimalAbatementPercentage, 1)}`,
      sub: `${fmtNumber(kpis.optimalAbatement)} tCO₂/年`,
      icon: TrendingDown,
      color: 'text-emerald-600 bg-emerald-50',
      ring: 'ring-emerald-100',
    },
    {
      label: '產品綠色溢價 (ΔLPC)',
      value: `+€${kpis.greenPremium.toFixed(2)}/噸`,
      sub: `${fmtPct(kpis.greenPremiumPercentage)} 佔基準 LPC`,
      icon: Coins,
      color: 'text-amber-600 bg-amber-50',
      ring: 'ring-amber-100',
    },
    {
      label: '避免之碳稅開支',
      value: `€${fmtCurrency(kpis.avoidedCarbonTax)}/年`,
      sub: '因自發減碳而少繳之碳稅',
      icon: ShieldCheck,
      color: 'text-sky-600 bg-sky-50',
      ring: 'ring-sky-100',
    },
    {
      label: 'CCfD 補貼需求',
      value: `€${fmtCurrency(kpis.ccfdSubsidyRequired)}/年`,
      sub: '推動更深層減碳所需補貼',
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50',
      ring: 'ring-indigo-100',
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ${c.ring} transition hover:shadow-md`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">{c.label}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Optimal levers + CAPEX/OPEX breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Optimal levers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">最優技術組合 (Optimal Lever Combination)</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {kpis.optimalLeverIds.length === 0 ? (
              <span className="text-sm text-slate-400">未啟用任何減碳技術（維持現狀基準）</span>
            ) : (
              kpis.optimalLeverIds.map((id) => (
                <span
                  key={id}
                  className="rounded-lg bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700"
                >
                  {id}
                </span>
              ))
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <span className="text-slate-400">剩餘排放量 (Residual Emissions)</span>
              <p className="mt-0.5 font-semibold text-slate-700">
                {fmtNumber(kpis.optimalEmissions)} tCO₂/年
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <span className="text-slate-400">年度碳稅支出 (Annual Carbon Tax)</span>
              <p className="mt-0.5 font-semibold text-slate-700">
                €{fmtCurrency(kpis.annualCarbonTax)}/年
              </p>
            </div>
          </div>
        </div>

        {/* CAPEX vs OPEX */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <PieChart className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">資本支出 (CAPEX) 與營運支出 (OPEX) 折現比重</span>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">資本支出 CAPEX（折現）</span>
                <span className="font-bold text-slate-700">
                  €{fmtCurrency(kpis.totalCapex)} ({kpis.capexShare.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
                  style={{ width: `${kpis.capexShare}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">營運支出 OPEX（折現現值）</span>
                <span className="font-bold text-slate-700">
                  €{fmtCurrency(kpis.totalPvOpex)} ({kpis.opexShare.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${kpis.opexShare}%` }}
                />
              </div>
            </div>
            <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs">
              <span className="text-slate-400">總折現支出 (Total Discounted Expenditure, DE)</span>
              <p className="mt-0.5 font-bold text-slate-700">
                €{fmtCurrency(kpis.totalCapex + kpis.totalPvOpex)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
