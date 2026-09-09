import {
  Bar,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FrontierStep } from '@/lib/decarbonizationEngine';
import { fmtCurrency, fmtNumber } from '@/lib/format';
import type { HighlightElement } from '@/components/MACCChartGuide';

interface MACCStepChartProps {
  frontierSteps: FrontierStep[];
  carbonPrice: number;
  optimalAbatement: number;
  highlight?: HighlightElement;
}

interface ChartDatum {
  name: string;
  abatement: number;
  abatementPct: number;
  mac: number;
  de: number;
  tac: number;
  isOptimal: boolean;
  isBelowCarbonPrice: boolean;
  leverIds: string[];
}

export function MACCStepChart({
  frontierSteps,
  carbonPrice,
  optimalAbatement,
  highlight,
}: MACCStepChartProps) {
  const data: ChartDatum[] = frontierSteps
    .filter((s) => s.totalAbatement > 0)
    .map((s) => {
      const isOptimal = Math.abs(s.totalAbatement - optimalAbatement) < 0.5;
      return {
        name: s.activeLeverIds.join(' + ') || 'baseline',
        abatement: s.totalAbatement,
        abatementPct: s.abatementPercentage,
        mac: s.marginalAbatementCost,
        de: s.totalDiscountedExpenditure,
        tac: s.totalAbatementCost,
        isOptimal,
        isBelowCarbonPrice: s.marginalAbatementCost <= carbonPrice,
        leverIds: s.activeLeverIds,
      };
    });

  const xHighlighted = highlight === 'x-axis';
  const yHighlighted = highlight === 'y-axis';
  const stepHighlighted = highlight === 'step';
  const lineHighlighted = highlight === 'carbon-line';

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
        <XAxis
          dataKey="abatementPct"
          type="number"
          domain={[0, 'dataMax']}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          label={{
            value: '累計減碳比例 (% of E₀)',
            position: 'insideBottom',
            offset: -10,
            style: {
              fontSize: '12px',
              fill: xHighlighted ? '#38bdf8' : '#64748b',
              fontWeight: xHighlighted ? 700 : 400,
            },
          }}
          stroke={xHighlighted ? '#38bdf8' : '#cbd5e1'}
          strokeWidth={xHighlighted ? 2 : 1}
          tick={{ fontSize: 11, fill: xHighlighted ? '#38bdf8' : '#94a3b8' }}
        />
        <YAxis
          tickFormatter={(v) => `€${v.toFixed(0)}`}
          stroke={yHighlighted ? '#fbbf24' : '#cbd5e1'}
          strokeWidth={yHighlighted ? 2 : 1}
          tick={{ fontSize: 11, fill: yHighlighted ? '#fbbf24' : '#94a3b8' }}
          label={{
            value: '年化邊際減排成本 MAC (€/tCO₂)',
            angle: -90,
            position: 'insideLeft',
            offset: 0,
            style: {
              fontSize: '12px',
              fill: yHighlighted ? '#fbbf24' : '#64748b',
              fontWeight: yHighlighted ? 700 : 400,
            },
          }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const d = payload[0].payload as ChartDatum;
            return (
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-1 text-sm font-bold text-slate-700">
                  技術組合 [{d.leverIds.join(' + ')}]
                </p>
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>
                    <span className="font-medium">減碳量：</span>{' '}
                    {fmtNumber(d.abatement)} tCO₂/年 ({d.abatementPct.toFixed(1)}%)
                  </p>
                  <p>
                    <span className="font-medium">邊際成本 MAC：</span> €{d.mac.toFixed(0)}/tCO₂
                  </p>
                  <p>
                    <span className="font-medium">折現支出 DE：</span> €{fmtCurrency(d.de)}
                  </p>
                  <p>
                    <span className="font-medium">總減碳成本 TAC：</span> €{fmtCurrency(d.tac)}
                  </p>
                  {d.isOptimal && (
                    <p className="mt-1 font-semibold text-emerald-600">
                      當前碳價下之最優組合
                    </p>
                  )}
                </div>
              </div>
            );
          }}
        />
        <ReferenceLine
          y={carbonPrice}
          stroke={lineHighlighted ? '#f87171' : '#ef4444'}
          strokeWidth={lineHighlighted ? 3.5 : 2}
          strokeDasharray="8 4"
          label={{
            value: `碳價 = €${carbonPrice}/tCO₂`,
            position: 'right',
            fill: lineHighlighted ? '#f87171' : '#ef4444',
            fontSize: 11,
            fontWeight: 600,
          }}
        />
        <Bar
          dataKey="mac"
          shape={(props: unknown) => {
            const p = props as {
              x: number;
              y: number;
              width: number;
              height: number;
              payload: ChartDatum;
            };
            const { x, y, width, height, payload } = p;
            const color = payload.isOptimal
              ? '#10b981'
              : payload.isBelowCarbonPrice
                ? '#0ea5e9'
                : '#94a3b8';
            const opacity = payload.isOptimal ? 1 : payload.isBelowCarbonPrice ? 0.7 : 0.45;
            const flash = stepHighlighted;
            return (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={color}
                  opacity={flash ? Math.min(opacity + 0.3, 1) : opacity}
                  rx={3}
                  stroke={flash ? '#34d399' : 'none'}
                  strokeWidth={flash ? 1.5 : 0}
                />
                {payload.isOptimal && (
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={width + 2}
                    height={height + 2}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={2}
                    rx={3}
                  />
                )}
              </g>
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
