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
  activeBorder: string;
  activeBg: string;
}

const guideItems: GuideItem[] = [
  {
    key: 'x-axis',
    icon: Ruler,
    title: '階梯寬度 (X 軸 — 減碳數量)',
    desc: '代表該技術組合能幫工廠減掉多少噸 CO₂，或以減碳百分比表示。寬度越寬，代表減碳潛力越大。',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
    activeBorder: 'border-sky-300',
    activeBg: 'bg-sky-50',
  },
  {
    key: 'y-axis',
    icon: TrendingUp,
    title: '階梯高度 (Y 軸 — 邊際單價 MAC)',
    desc: '代表每多減一噸碳，每年平均要花的錢。',
    tip: '低於 0（負數）代表不只減碳還能省電費 / 燃料費；越高代表減碳單價越貴。',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    activeBorder: 'border-amber-300',
    activeBg: 'bg-amber-50',
  },
  {
    key: 'step',
    icon: Layers3,
    title: '階梯圖塊 (技術組合包)',
    desc: '每個階梯代表一套考慮技術干涉後的最佳技術組合（如「優化研磨 + 鈣循環」），並非單一孤立技術。',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-100',
    activeBorder: 'border-brand-400',
    activeBg: 'bg-brand-50',
  },
  {
    key: 'carbon-line',
    icon: Minus,
    title: '碳價基準虛線 (外部政策基準)',
    desc: '代表當前政府徵收的碳稅或市場碳價。虛線高於階梯代表自主減碳比繳稅划算；虛線低於階梯代表繳碳稅相對便宜。',
    color: 'text-rust-600',
    bgColor: 'bg-rust-50',
    borderColor: 'border-rust-100',
    activeBorder: 'border-rust-300',
    activeBg: 'bg-rust-50',
  },
];

export function MACCChartGuide({
  frontierSteps,
  carbonPrice,
  optimalAbatement,
  kpis,
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
    <div className="flex flex-col gap-4 rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
      {/* Collapse / Expand header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-mist-700">MACC 圖表導讀與分析</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg bg-mist-100 px-2.5 py-1 text-xs font-medium text-mist-500 transition hover:bg-mist-200 hover:text-mist-700"
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
            <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">
              模組一 · 圖表三大要素圖解
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {guideItems.map((item) => {
                const Icon = item.icon;
                const isActive = highlight === item.key;
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => onHighlightChange(item.key)}
                    onMouseLeave={() => onHighlightChange(null)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
                      isActive
                        ? `${item.activeBorder} ${item.activeBg} shadow-sm`
                        : `${item.borderColor} bg-white`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-xs font-bold text-mist-700">{item.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-mist-500">{item.desc}</p>
                    {item.tip && (
                      <p className="mt-1 text-xs leading-relaxed text-mist-400">
                        <span className="font-semibold text-mist-500">提示：</span>
                        {item.tip}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-mist-400">
              滑鼠移至上方卡片，圖表對應元素將同步高亮
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-mist-100" />

          {/* Module 2: Dynamic real-time insights */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">
              模組二 · 當前決策動態解讀
            </p>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Golden decision card */}
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-bold text-brand-700">當前黃金決策</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mist-700">
                  當前碳價{' '}
                  <span className="font-mono font-bold text-brand-700">
                    €{carbonPrice.toFixed(0)}
                  </span>{' '}
                  下，最省錢的方案是高亮顯示的
                  <span className="font-bold text-brand-700">「{optimalLabel}」</span>
                  ，可幫工廠減碳{' '}
                  <span className="font-mono font-bold text-brand-700">
                    {optimalPct.toFixed(1)}%
                  </span>
                  （{(optimalTonnes / 10000).toFixed(1)} 萬噸 CO₂/年）。
                </p>
              </div>

              {/* Break-even alert card */}
              <div
                className={`rounded-lg border p-3 ${
                  netSavings > 0 ? 'border-sky-200 bg-sky-50' : 'border-mist-200 bg-mist-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PiggyBank
                    className={`h-4 w-4 ${netSavings > 0 ? 'text-sky-600' : 'text-mist-400'}`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      netSavings > 0 ? 'text-sky-700' : 'text-mist-500'
                    }`}
                  >
                    損益平衡比對 (Break-even Alert)
                  </span>
                </div>
                {netSavings > 0 ? (
                  <p className="mt-2 text-sm leading-relaxed text-mist-700">
                    相較於直接繳納高額碳稅，採用此黃金組合每年可為企業省下約{' '}
                    <span className="font-mono font-bold text-sky-700">
                      €{fmtCurrency(Math.abs(netSavings))}
                    </span>{' '}
                    的淨開支！
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-mist-500">
                    在當前碳價下，自主減碳成本仍高於直接繳稅。建議拉高碳價滑桿觀察損益平衡點。
                  </p>
                )}
              </div>
            </div>

            {/* Leapfrog warning card */}
            {isLeapfrog && (
              <div className="rounded-lg border border-rust-200 bg-rust-50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rust-600" />
                  <span className="text-xs font-bold text-rust-700">技術越級與陡升警訊</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mist-700">
                  注意：階梯高度陡升！代表傳統燃料 / 原料替代已達極限。演算法已自動跳過過渡技術，建議直接越級投資
                  <span className="font-bold text-rust-700">「鈣循環碳捕集 (CL)」</span>
                  以獲得長期最大收益。
                </p>
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="rounded-lg bg-mist-50 p-2">
                <p className="text-[10px] text-mist-400">剩餘排放量</p>
                <p className="font-mono text-sm font-bold text-mist-800">
                  {fmtNumber(kpis.optimalEmissions)} tCO₂/年
                </p>
              </div>
              <div className="rounded-lg bg-mist-50 p-2">
                <p className="text-[10px] text-mist-400">年度碳稅支出</p>
                <p className="font-mono text-sm font-bold text-mist-800">
                  €{fmtCurrency(kpis.annualCarbonTax)}/年
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!expanded && (
        <p className="text-xs text-mist-500">
          點擊「展開教學」查看圖表導讀與即時分析。目前碳價 €{carbonPrice.toFixed(0)}/tCO₂
          ，最優組合：{optimalLabel}（{optimalPct.toFixed(1)}%）
        </p>
      )}
    </div>
  );
}
