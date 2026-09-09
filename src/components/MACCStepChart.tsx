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

// Design tokens shared with MACCChartGuide's highlight cards, so hovering a
// guide card and the chart element it describes always match in color.
const AXIS_DEFAULT = '#96A6A4'; // mist-400
const AXIS_LABEL_DEFAULT = '#71827F'; // mist-500
const AXIS_LINE_DEFAULT = '#C2CECD'; // mist-300
const X_HIGHLIGHT = '#0284C7'; // sky-600
const Y_HIGHLIGHT = '#B45309'; // amber-700
const CARBON_LINE = '#B5504B'; // rust-500
const CARBON_LINE_ACTIVE = '#9B3E3A'; // rust-600

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
              fill: xHighlighted ? X_HIGHLIGHT : AXIS_LABEL_DEFAULT,
              fontWeight: xHighlighted ? 700 : 400,
            },
          }}
          stroke={xHighlighted ? X_HIGHLIGHT : AXIS_LINE_DEFAULT}
          strokeWidth={xHighlighted ? 2 : 1}
          tick={{ fontSize: 11, fill: xHighlighted ? X_HIGHLIGHT : AXIS_DEFAULT }}
        />
        <YAxis
          tickFormatter={(v) => `€${v.toFixed(0)}`}
          stroke={yHighlighted ? Y_HIGHLIGHT : AXIS_LINE_DEFAULT}
          strokeWidth={yHighlighted ? 2 : 1}
          tick={{ fontSize: 11, fill: yHighlighted ? Y_HIGHLIGHT : AXIS_DEFAULT }}
          label={{
            value: '年化邊際減排成本 MAC (€/tCO₂)',
            angle: -90,
            position: 'insideLeft',
            offset: 0,
            style: {
              fontSize: '12px',
              fill: yHighlighted ? Y_HIGHLIGHT : AXIS_LABEL_DEFAULT,
              fontWeight: yHighlighted ? 700 : 400,
            },
          }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(64, 128, 128, 0.06)' }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const d = payload[0].payload as ChartDatum;
            return (
              <div className="rounded-lg border border-mist-200 bg-white p-3 shadow-lg">
                <p className="mb-1 text-sm font-bold text-mist-700">
                  技術組合 [{d.leverIds.join(' + ')}]
                </p>
                <div className="space-y-0.5 text-xs text-mist-500">
                  <p>
                    <span className="font-medium">減碳量：</span>{' '}
                    <span className="font-mono">
                      {fmtNumber(d.abatement)} tCO₂/年 ({d.abatementPct.toFixed(1)}%)
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">邊際成本 MAC：</span>{' '}
                    <span className="font-mono">€{d.mac.toFixed(0)}/tCO₂</span>
                  </p>
                  <p>
                    <span className="font-medium">折現支出 DE：</span>{' '}
                    <span className="font-mono">€{fmtCurrency(d.de)}</span>
                  </p>
                  <p>
                    <span className="font-medium">總減碳成本 TAC：</span>{' '}
                    <span className="font-mono">€{fmtCurrency(d.tac)}</span>
                  </p>
                  {d.isOptimal && (
                    <p className="mt-1 font-semibold text-brand-600">當前碳價下之最優組合</p>
                  )}
                </div>
              </div>
            );
          }}
        />
        <ReferenceLine
          y={carbonPrice}
          stroke={lineHighlighted ? CARBON_LINE_ACTIVE : CARBON_LINE}
          strokeWidth={lineHighlighted ? 3.5 : 2}
          strokeDasharray="8 4"
          label={{
            value: `碳價 = €${carbonPrice}/tCO₂`,
            position: 'right',
            fill: lineHighlighted ? CARBON_LINE_ACTIVE : CARBON_LINE,
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
              ? '#2D5A5A' // brand-700
              : payload.isBelowCarbonPrice
                ? '#96B9B9' // brand-300
                : '#C2CECD'; // mist-300
            const opacity = payload.isOptimal ? 1 : payload.isBelowCarbonPrice ? 0.9 : 0.6;
            const flash = stepHighlighted;
            return (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={color}
                  opacity={flash ? Math.min(opacity + 0.15, 1) : opacity}
                  rx={3}
                  stroke={flash ? '#408080' : 'none'}
                  strokeWidth={flash ? 1.5 : 0}
                />
                {payload.isOptimal && (
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={width + 2}
                    height={height + 2}
                    fill="none"
                    stroke="#1A3333"
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
