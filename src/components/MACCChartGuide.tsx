import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Ruler,
  TrendingUp,
  Layers3,
  Minus,
  Sparkles,
  PiggyBank,
  AlertTriangle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ExtendedExecutiveKPIs, FrontierStep } from '@/lib/decarbonizationEngine';
import { fmtCurrency, fmtNumber } from '@/lib/format';

export type HighlightElement = 'x-axis' | 'y-axis' | 'step' | 'carbon-line' | null;

interface MACCChartGuideProps {
  frontierSteps: FrontierStep[];
  carbonPrice: number;
  optimalAbatement: number;
  kpis: ExtendedExecutiveKPIs;
  E0: number;
  highlight: HighlightElement;
  onHighlightChange: (h: HighlightElement) => void;
}

interface GuideItem {
  key: HighlightElement;
  icon: LucideIcon;
  title: string;
  desc: string;
  tip?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const guideItems: GuideItem[] = [
  {
    key: 'x-axis',
    icon: Ruler,
    title: '階梯寬度 (X 軸 — 減碳數量)',
    desc: '代表該技術組合能幫工廠「減掉多少噸 CO₂」或「減碳百分比」。寬度越寬，代表減碳潛力越大。',
    color: 'text-sky-300',
    bgColor: 'bg-sky-950/40',
    borderColor: 'border-sky-800/50',
  },
  {
    key: 'y-axis',
    icon: TrendingUp,
    title: '階梯高度 (Y 軸 — 邊際單價 MAC)',
    desc: '代表「每多減一噸碳，每年平均要花的錢」。',
    tip: '低於 0（負數）代表不只減碳還能省電費 / 燃料費；越高代表減碳單價越貴。',
    color: 'text-amber-300',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-800/50',
  },
  {
    key: 'step',
    icon: Layers3,
    title: '階梯圖塊 (技術組合包)',
    desc: '每個階梯代表一套「考慮技術干涉後的最佳技術組合」（如 [優化研磨 + 鈣循環]），非單一孤立技術。',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-800/50',
  },
  {
    key: 'carbon-line',
    icon: Minus,
    title: '碳價紅虛線 (外部政策基準)',
    desc: '代表當前政府徵收的碳稅或市場碳價。紅線高於階梯 ➔ 自治減碳比繳稅划算；紅線低於階梯 ➔ 繳碳稅相對便宜。',
    color: 'text-red-300',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-800/50',
  },
];

export function MACCChartGuide({
  frontierSteps,
  carbonPrice,
  optimalAbatement,
  kpis,
  E0,
  highlight,
  onHighlightChange,
}: MACCChartGuideProps) {
  const [expanded, setExpanded] = useState(true);

  const optimalStep = frontierSteps.find(
    (s) => Math.abs(s.totalAbatement - optimalAbatement) < 0.5,
  );
  const optimalLabel = optimalStep?.activeLeverIds.join(' + ') || '維持現狀';
  const optimalPct = optimalStep?.abatementPercentage ?? 0;
  const optimalTonnes = optimalStep?.totalAbatement ?? 0;

  // Break-even: net savings = avoided carbon tax - annualized abatement cost
  const annualizedTAC = kpis.annualizedTAC;
  const netSavings = kpis.avoidedCarbonTax - annualizedTAC;
  const isLeapfrog = kpis.isLeapfrogTriggered && carbonPrice >= 141;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700/50 bg-slate-900 p-4 shadow-lg">
      {/* Collapse / Expand header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">MACC 圖表導讀與分析</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> 收合
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> 展開教學
            </>
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* Module 1: Static guide cards */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              模組一 · 圖表三大要素圖解
            </p>
            {guideItems.map((item) => {
              const Icon = item.icon;
              const isActive = highlight === item.key;
              return (
                <div
                  key={item.key}
                  onMouseEnter={() => onHighlightChange(item.key)}
                  onMouseLeave={() => onHighlightChange(null)}
                  className={`rounded-lg border p-3 transition-all duration-200 ${item.borderColor} ${item.bgColor} ${
                    isActive ? 'ring-2 ring-emerald-500/50 scale-[1.02]' : 'opacity-80'
                  } cursor-pointer`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                  {item.tip && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      <span className="font-semibold text-slate-400">提示：</span>
                      {item.tip}
                    </p>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-slate-600">
              滑鼠移至上方卡片，圖表對應元素將同步閃爍高亮
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Module 2: Dynamic real-time insights */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              模組二 · 當前決策動態解讀
            </p>

            {/* Golden decision card */}
            <div className="rounded-lg border border-emerald-700/50 bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">當前黃金決策</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                當前碳價{' '}
                <span className="font-bold text-emerald-300">€{carbonPrice.toFixed(0)}</span>{' '}
                下，最省錢的方案是高亮顯示的
                <span className="font-bold text-emerald-300">「{optimalLabel}」</span>
                ，可幫工廠減碳{' '}
                <span className="font-bold text-emerald-300">{optimalPct.toFixed(1)}%</span>
                （{(optimalTonnes / 10000).toFixed(1)} 萬噸 CO₂/年）。
              </p>
            </div>

            {/* Break-even alert card */}
            <div
              className={`rounded-lg border p-3 ${
                netSavings > 0
                  ? 'border-sky-700/50 bg-gradient-to-br from-sky-900/40 to-sky-950/40'
                  : 'border-slate-700/50 bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <PiggyBank className={`h-4 w-4 ${netSavings > 0 ? 'text-sky-400' : 'text-slate-500'}`} />
                <span className={`text-xs font-bold ${netSavings > 0 ? 'text-sky-300' : 'text-slate-400'}`}>
                  損益平衡比對 (Break-even Alert)
                </span>
              </div>
              {netSavings > 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  相較於直接繳納高額碳稅，採用此黃金組合每年可為企業
                  {netSavings > 0 ? '省下' : '多花'}約{' '}
                  <span className="font-bold text-sky-300">
                    €{fmtCurrency(Math.abs(netSavings))}
                  </span>{' '}
                  的淨開支！
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  在當前碳價下，自主減碳成本仍高於直接繳稅。建議拉高碳價滑桿觀察損益平衡點。
                </p>
              )}
            </div>

            {/* Leapfrog warning card */}
            {isLeapfrog && (
              <div className="rounded-lg border border-orange-600/50 bg-gradient-to-br from-orange-900/50 to-red-950/50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300">技術越級與陡升警訊</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  注意：階梯高度陡升！代表傳統燃料 / 原料替代已達極限。演算法已自動跳過過渡技術，建議直接越級投資
                  <span className="font-bold text-orange-300">「鈣循環碳捕集 (CL)」</span>
                  以獲得長期最大收益。
                </p>
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-[10px] text-slate-500">剩餘排放量</p>
                <p className="text-sm font-bold text-slate-200">
                  {fmtNumber(kpis.optimalEmissions)} tCO₂/年
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-[10px] text-slate-500">年度碳稅支出</p>
                <p className="text-sm font-bold text-slate-200">
                  €{fmtCurrency(kpis.annualCarbonTax)}/年
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!expanded && (
        <p className="text-xs text-slate-500">
          點擊「展開教學」查看圖表導讀與即時分析。目前碳價 €{carbonPrice.toFixed(0)}/tCO₂
          ，最優組合：{optimalLabel}（{optimalPct.toFixed(1)}%）
        </p>
      )}
    </div>
  );
}
