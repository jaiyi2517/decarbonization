import { useState } from 'react';
import {
  X,
  Target,
  SlidersHorizontal,
  BarChart3,
  Building2,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface UserGuideModalProps {
  open: boolean;
  onClose: () => void;
}

type GuideTab = 'purpose' | 'inputs' | 'chart' | 'scenarios';

const tabs: { id: GuideTab; label: string; icon: typeof Target }[] = [
  { id: 'purpose', label: '計算器核心目的', icon: Target },
  { id: 'inputs', label: '輸入參數指南', icon: SlidersHorizontal },
  { id: 'chart', label: '圖表解讀', icon: BarChart3 },
  { id: 'scenarios', label: '企業應用情境', icon: Building2 },
];

export function UserGuideModal({ open, onClose }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('purpose');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">使用說明 / 操作指南</h2>
              <p className="text-xs text-slate-400">Decarbonization Cost Calculator — User Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === t.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'purpose' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <Target className="h-4 w-4" /> 組合優化模型 (Combinatorial MACC Model)
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  本工具採用「組合優化模型 (Combinatorial MACC Model)」，有別於傳統麥肯錫
                  (McKinsey) MACC 曲線將各減碳技術視為獨立個體，本模型將所有可行技術組合進行
                  全域窮舉 (2^n 種排列)，並考量技術間的「干涉效應 (Interaction Effect)」——
                  例如原料替代 (Raw Material Substitution) 會降低熟料產量，進而縮減後端碳捕集
                  (Carbon Capture) 的可捕集量。
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">核心解決問題：</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>避免高估減碳效果</strong>：傳統模型忽略干涉，可能高估組合減碳量達
                      20-30%。本模型以「乘數干涉 (Multiplicative Interaction)」精確計算。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>找出真正最省錢的去碳路徑</strong>：透過帕累托優化 (Pareto
                      Optimization) 篩選「成本有效前緣 (Cost-Efficient Frontier)」，剔除被支配的無效解。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>偵測技術越級 (Leapfrogging)</strong>：當碳價跨過臨界點，演算法自動偵測
                      是否應跳過過渡技術、直接投資深層減碳方案。
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'inputs' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-700">
                  <SlidersHorizontal className="h-4 w-4" /> 輸入參數建議預設值
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      預期外部碳價 / 碳稅 (p, €/tCO₂)
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      建議先設定為<strong> €85/噸</strong>（EU ETS 基準價），再拉高至
                      <strong> €126</strong> 或 <strong>€141</strong> 測試「技術越級
                      (Leapfrog)」臨界點。當碳價超過 €141 時，系統可能建議跳過 LEILAC
                      直接投資鈣循環 (Calcium Looping)。
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      二氧化碳運輸與封存快遞費 (c_TS, €/tCO₂ Captured)
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      預設每噸 <strong>€80</strong>，代表將捕集之 CO₂ 送往地底封存的
                      運輸與儲存開銷。此費用會直接疊加在碳捕集技術的變動營運成本上。
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      折現率 (r, WACC) 與評估年限 (T)
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      建議設為 <strong>5%</strong> 與 <strong>25 年</strong>，符合一般重工業
                      資產折舊慣例。折現率越高，未來營運成本的現值越低，有利於高 CAPEX、
                      低 OPEX 的技術（如鈣循環）。
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      免費碳配額 (A_free, tCO₂/年)
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      預設為 <strong>0</strong>。若政府核發免費配額，可調高此值；
                      系統僅對超過免費額度的排放量課徵碳稅。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <BarChart3 className="h-4 w-4" /> 如何看懂 MACC 階梯圖表
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>
                    <strong>橫軸 (X 軸)</strong>：累計減碳比例 (%)，由左至右代表從 0%
                    到最大可行減碳量。每個長條代表一個「技術組合」。
                  </p>
                  <p>
                    <strong>縱軸 (Y 軸)</strong>：年化邊際減排成本 MAC (€/tCO₂)，即每多減少
                    一噸 CO₂ 所需的年化成本。
                  </p>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="font-semibold text-emerald-700">高亮區塊 = 當前碳價下的黃金決策組合</p>
                    <p className="mt-1 text-sm text-emerald-600">
                      圖中<strong>綠色高亮長條</strong>代表在當前碳價下，使企業總財務負擔
                      Z(E,p) 最低的最優技術組合 (Optimal Technology Mix)。
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="font-semibold text-red-700">紅色虛線 = 當前外部碳價基準線</p>
                    <p className="mt-1 text-sm text-red-600">
                      當紅線（碳價）<strong>高於</strong>某個階梯時，代表「自己花錢減碳比繳碳稅更便宜」
                      ，該階梯顯示為藍色。當紅線<strong>低於</strong>階梯時，代表該技術組合
                      的邊際成本高於碳價，顯示為灰色。
                    </p>
                  </div>
                  <p>
                    <strong>互動方式</strong>：拖曳左側的「碳價滑桿」，紅線會即時上下移動，
                    階梯高亮也會同步響應，讓您快速找到不同碳價情境下的最佳決策。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Building2 className="h-4 w-4" /> 企業內部四大應用情境
              </h3>
              {[
                {
                  title: '1. 爭取 CapEx 預算',
                  desc: 'ESG / 工程團隊可將「成本有效前緣」上的技術組合及其 CAPEX vs OPEX 折現比重，作為向 CFO 與董事會申請資本支出預算的量化依據。圖表直觀展示每億歐元投資可換取的減碳噸數。',
                  color: 'bg-sky-50 border-sky-100',
                },
                {
                  title: '2. 評估產品綠色溢價 (Green Premium / ΔLPC)',
                  desc: '行銷與產品團隊可參考 KPI 卡片中的「綠色溢價」指標，了解每噸產品因減碳而增加的平準化生產成本，作為低碳產品定價策略的基礎。',
                  color: 'bg-amber-50 border-amber-100',
                },
                {
                  title: '3. 申請碳差價合約 (CCfD) 補貼',
                  desc: '當某些深層減碳技術的 MAC 高於當前碳價時，系統自動計算出向政府申請 CCfD 所需的最低年度定額補貼金額。CFO 可將此數據直接用於政府補貼談判。',
                  color: 'bg-indigo-50 border-indigo-100',
                },
                {
                  title: '4. 驗證淨零承諾 (Net-Zero Pledge)',
                  desc: '永續長 (CSO) 可利用本工具驗證企業公開承諾的淨零目標在技術與經濟上是否可行，並量化達成不同減碳比例（如 50%、80%、96%）所需的總折現支出。',
                  color: 'bg-emerald-50 border-emerald-100',
                },
              ].map((s) => (
                <div key={s.title} className={`rounded-lg border p-4 ${s.color}`}>
                  <p className="text-sm font-bold text-slate-700">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-teal-700"
          >
            開始使用
          </button>
        </div>
      </div>
    </div>
  );
}
