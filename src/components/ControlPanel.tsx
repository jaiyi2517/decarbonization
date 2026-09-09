import { useState } from 'react';
import { ChevronDown, ChevronUp, Factory, Globe, Sliders } from 'lucide-react';
import type {
  MacroEconomicContext,
  PlantBaselineInput,
} from '@/types/decarbonization';
import { plantTemplates } from '@/lib/decarbonizationEngine';

interface ControlPanelProps {
  plant: PlantBaselineInput;
  macro: MacroEconomicContext;
  onPlantChange: (p: PlantBaselineInput) => void;
  onMacroChange: (m: MacroEconomicContext) => void;
  onTemplateChange: (idx: number) => void;
  selectedTemplate: number;
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  unit,
  onChange,
  presets,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  presets?: { label: string; value: number }[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        <span className="text-sm font-bold text-slate-700">
          €{value.toFixed(0)}
          <span className="ml-0.5 text-xs font-normal text-slate-400">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-sky-500"
      />
      {presets && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                Math.abs(value - p.value) < 0.5
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ControlPanel({
  plant,
  macro,
  onPlantChange,
  onMacroChange,
  onTemplateChange,
  selectedTemplate,
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-5">
      {/* Template selector */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Factory className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">廠房範本</h3>
        </div>
        <select
          value={selectedTemplate}
          onChange={(e) => onTemplateChange(parseInt(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
        >
          {plantTemplates.map((t, i) => (
            <option key={i} value={i}>
              {t.label}
            </option>
          ))}
        </select>
      </section>

      {/* Carbon price slider */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">外部參數</h3>
        </div>
        <div className="space-y-4">
          <Slider
            label="預期外部碳價 / 碳稅 (p)"
            min={0}
            max={300}
            step={1}
            value={macro.carbonPrice}
            unit="/tCO₂"
            onChange={(v) => onMacroChange({ ...macro, carbonPrice: v })}
            presets={[
              { label: '€0', value: 0 },
              { label: '€85', value: 85 },
              { label: '€126', value: 126 },
              { label: '€141', value: 141 },
            ]}
          />
          <Slider
            label="二氧化碳運輸與封存快遞費 (c_TS)"
            min={0}
            max={200}
            step={1}
            value={macro.c_TS}
            unit="/tCO₂ 捕集"
            onChange={(v) => onMacroChange({ ...macro, c_TS: v })}
          />
        </div>
      </section>

      {/* Advanced settings */}
      <section>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            企業進階設定
          </span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-100 p-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">加權平均資金成本折現率 (WACC, r)</label>
                <span className="text-sm font-bold text-slate-700">{(plant.r * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.15}
                step={0.005}
                value={plant.r}
                onChange={(e) => onPlantChange({ ...plant, r: parseFloat(e.target.value) })}
                className="w-full accent-sky-500"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">設備評估營運年限 (T)</label>
                <span className="text-sm font-bold text-slate-700">{plant.T} 年</span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={1}
                value={plant.T}
                onChange={(e) => onPlantChange({ ...plant, T: parseInt(e.target.value) })}
                className="w-full accent-sky-500"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">政府核發之免費碳配額 (A_free)</label>
                <span className="text-sm font-bold text-slate-700">
                  {macro.A_free.toLocaleString()} tCO₂/年
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={plant.E0}
                step={1000}
                value={macro.A_free}
                onChange={(e) => onMacroChange({ ...macro, A_free: parseFloat(e.target.value) })}
                className="w-full accent-sky-500"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
