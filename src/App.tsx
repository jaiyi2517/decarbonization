import { useMemo, useState } from 'react';
import { Leaf, BarChart3, LayoutDashboard, AlertCircle, BookOpen } from 'lucide-react';
import type {
  MacroEconomicContext,
  PlantBaselineInput,
} from '@/types/decarbonization';
import {
  defaultMacroContext,
  plantTemplates,
  runFullCalculation,
} from '@/lib/decarbonizationEngine';
import { ControlPanel } from '@/components/ControlPanel';
import { MACCStepChart } from '@/components/MACCStepChart';
import { ExecutiveKPICards } from '@/components/ExecutiveKPICards';
import { LeapfrogCCfDModule } from '@/components/LeapfrogCCfDModule';
import { UserGuideModal } from '@/components/UserGuideModal';
import { MACCChartGuide, type HighlightElement } from '@/components/MACCChartGuide';

type Tab = 'dashboard' | 'chart';

function App() {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [plant, setPlant] = useState<PlantBaselineInput>(plantTemplates[0].plant);
  const [macro, setMacro] = useState<MacroEconomicContext>(defaultMacroContext);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [guideOpen, setGuideOpen] = useState(false);
  const [highlight, setHighlight] = useState<HighlightElement>(null);

  const template = plantTemplates[templateIdx];

  const result = useMemo(() => {
    return runFullCalculation({
      plant,
      macro,
      levers: template.levers,
      interactions: template.interactions,
    });
  }, [plant, macro, template]);

  const feasibleCount = result.frontier.allCombinations.filter((c) => c.isFeasible).length;
  const totalCombos = result.frontier.allCombinations.length;

  const handleTemplateChange = (idx: number) => {
    setTemplateIdx(idx);
    setPlant(plantTemplates[idx].plant);
  };

  const chartSection = (title: string, hint?: string) => (
    <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-mist-700">{title}</h3>
        {hint ? (
          <p className="text-xs text-mist-400">{hint}</p>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-mist-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-700" /> 最優組合
            </span>
            <span className="flex items-center gap-1.5 text-mist-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-300" /> 低於碳價
            </span>
            <span className="flex items-center gap-1.5 text-mist-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-mist-300" /> 高於碳價
            </span>
          </div>
        )}
      </div>
      <MACCStepChart
        frontierSteps={result.frontierSteps}
        carbonPrice={macro.carbonPrice}
        optimalAbatement={result.optimal.optimalAbatement}
        highlight={highlight}
      />
    </div>
  );

  const guideSection = (
    <MACCChartGuide
      frontierSteps={result.frontierSteps}
      carbonPrice={macro.carbonPrice}
      optimalAbatement={result.optimal.optimalAbatement}
      kpis={result.extendedKPIs}
      highlight={highlight}
      onHighlightChange={setHighlight}
    />
  );

  return (
    <div className="min-h-screen bg-mist-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-mist-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-mist-800 sm:text-lg">
                企業內部碳減排成本計算器
              </h1>
              <p className="text-xs text-mist-400">
                組合優化模型 (Combinatorial MACC) — 決策儀表板
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-xs text-mist-500 sm:flex">
              <span className="rounded-full bg-mist-100 px-3 py-1 font-mono font-medium">
                {feasibleCount}/{totalCombos} 可行組合
              </span>
              <span className="rounded-full bg-mist-100 px-3 py-1 font-mono font-medium">
                {result.frontier.efficientFrontier.length} 個前緣點
              </span>
              <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
                {plant.plantName}
              </span>
            </div>
            <button
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">使用說明</span>
              <span className="sm:hidden">說明</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:flex lg:items-start">
        {/* Left sidebar: Control Panel */}
        <aside className="mb-6 w-full lg:mb-0 lg:w-72 lg:shrink-0">
          <div className="sticky top-20 rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
            <ControlPanel
              plant={plant}
              macro={macro}
              onPlantChange={setPlant}
              onMacroChange={setMacro}
              onTemplateChange={handleTemplateChange}
              selectedTemplate={templateIdx}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 space-y-6">
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg border border-mist-200 bg-white p-1 shadow-sm">
            {([
              { id: 'dashboard' as Tab, label: '決策儀表板', icon: LayoutDashboard },
              { id: 'chart' as Tab, label: 'MACC 階梯圖表', icon: BarChart3 },
            ]).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-mist-500 hover:bg-mist-50 hover:text-mist-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'dashboard' && (
            <>
              {/* KPI cards */}
              <ExecutiveKPICards kpis={result.extendedKPIs} />

              {/* MACC chart, guide stacked below */}
              <div className="space-y-4">
                {chartSection('MACC 階梯圖表')}
                {guideSection}
              </div>

              {/* Leapfrog + CCfD */}
              <LeapfrogCCfDModule
                kpis={result.extendedKPIs}
                frontierSteps={result.frontierSteps}
                carbonPrice={macro.carbonPrice}
              />
            </>
          )}

          {tab === 'chart' && (
            <div className="space-y-4">
              {/* MACC chart, guide stacked below */}
              {chartSection(
                '邊際減排成本曲線 (MACC Curve)',
                '拖曳左側碳價滑桿，即可即時查看最優階梯高亮變化',
              )}
              {guideSection}

              {/* Frontier detail table */}
              <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-mist-700">成本有效前緣明細</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-mist-50 text-left text-mist-500">
                        <th className="px-3 py-2 font-semibold">技術組合</th>
                        <th className="px-3 py-2 text-right font-semibold">減碳量</th>
                        <th className="px-3 py-2 text-right font-semibold">減碳比例</th>
                        <th className="px-3 py-2 text-right font-semibold">折現支出 DE</th>
                        <th className="px-3 py-2 text-right font-semibold">總減碳成本 TAC</th>
                        <th className="px-3 py-2 text-right font-semibold">邊際成本 MAC</th>
                        <th className="px-3 py-2 text-center font-semibold">狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.frontierSteps.map((step, i) => {
                        const isOptimal =
                          Math.abs(step.totalAbatement - result.optimal.optimalAbatement) < 0.5;
                        const below = step.marginalAbatementCost <= macro.carbonPrice;
                        return (
                          <tr
                            key={i}
                            className={`border-t border-mist-100 ${
                              isOptimal ? 'bg-brand-50/60' : below ? 'bg-mist-50/60' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-mist-700">
                              {step.activeLeverIds.join(' + ') || '— 維持現狀 —'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-mist-600">
                              {step.totalAbatement.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-mist-600">
                              {step.abatementPercentage.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-mist-600">
                              €{(step.totalDiscountedExpenditure / 1e6).toFixed(1)}M
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-mist-600">
                              €{(step.totalAbatementCost / 1e6).toFixed(1)}M
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-mist-700">
                              €{step.marginalAbatementCost.toFixed(0)}/tCO₂
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isOptimal ? (
                                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                                  最優
                                </span>
                              ) : below ? (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                  具經濟效益
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  高於碳價
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer note */}
      <footer className="border-t border-mist-200 bg-white py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-xs text-mist-400 sm:px-6">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>
            本計算器基於組合優化模型 (Combinatorial MACC Model)，所有成本均以歐元 (EUR) 計價。
            參數變更時結果即時更新。
          </span>
        </div>
      </footer>

      {/* User Guide Modal */}
      <UserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}

export default App;
