"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { SetPieceMode, PitchViewMode } from "./types";

interface SetPieceFiltersBarProps {
  mode: SetPieceMode;
  pitchView: PitchViewMode;
  attackDefenseFilter: string;
  periodFilter: string;
  typeFilter: string;
  zoneFilter: string;
  sideFilter: string;
  techniqueFilter: string;
  targetFilter: string;
  takerFilter: string;
  attackDefenseOptions: string[];
  periodOptions: string[];
  typeOptions: string[];
  zoneOptions: string[];
  sideOptions: string[];
  techniqueOptions: string[];
  targetOptions: string[];
  takerOptions: string[];
  onModeChange: (mode: SetPieceMode) => void;
  onPitchViewChange: (view: PitchViewMode) => void;
  onAttackDefenseChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onSideChange: (value: string) => void;
  onTechniqueChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTakerChange: (value: string) => void;
  onReset: () => void;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <Label className="text-xs font-semibold uppercase">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const SetPieceFiltersBar = ({
  mode,
  pitchView,
  attackDefenseFilter,
  periodFilter,
  typeFilter,
  zoneFilter,
  sideFilter,
  techniqueFilter,
  targetFilter,
  takerFilter,
  attackDefenseOptions,
  periodOptions,
  typeOptions,
  zoneOptions,
  sideOptions,
  techniqueOptions,
  targetOptions,
  takerOptions,
  onModeChange,
  onPitchViewChange,
  onAttackDefenseChange,
  onPeriodChange,
  onTypeChange,
  onZoneChange,
  onSideChange,
  onTechniqueChange,
  onTargetChange,
  onTakerChange,
  onReset,
}: SetPieceFiltersBarProps) => {
  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex w-full flex-wrap items-end gap-3">
        {/* Mode toggle */}
        <div className="min-w-0 space-y-1">
          <Label className="text-xs font-semibold uppercase">Mode</Label>
          <div className="flex h-8 gap-0.5 rounded-md border border-border">
            <button
              type="button"
              className={`px-3 text-xs font-medium transition-colors ${mode === "indirect" ? "bg-primary text-primary-foreground" : "hover:bg-muted"} rounded-l-md`}
              onClick={() => onModeChange("indirect")}
            >
              Indirect
            </button>
            <button
              type="button"
              className={`px-3 text-xs font-medium transition-colors ${mode === "direct" ? "bg-primary text-primary-foreground" : "hover:bg-muted"} rounded-r-md`}
              onClick={() => onModeChange("direct")}
            >
              Direct
            </button>
          </div>
        </div>

        {/* Pitch view toggle (indirect mode only) */}
        {mode === "indirect" && (
          <div className="min-w-0 space-y-1">
            <Label className="text-xs font-semibold uppercase">View</Label>
            <div className="flex h-8 gap-0.5 rounded-md border border-border">
              <button
                type="button"
                className={`px-3 text-xs font-medium transition-colors ${pitchView === "individual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"} rounded-l-md`}
                onClick={() => onPitchViewChange("individual")}
              >
                Dots
              </button>
              <button
                type="button"
                className={`px-3 text-xs font-medium transition-colors ${pitchView === "zones" ? "bg-primary text-primary-foreground" : "hover:bg-muted"} rounded-r-md`}
                onClick={() => onPitchViewChange("zones")}
              >
                Zones
              </button>
            </div>
          </div>
        )}

        <FilterDropdown
          label="Atk/Def"
          value={attackDefenseFilter}
          options={attackDefenseOptions}
          onChange={onAttackDefenseChange}
        />

        <FilterDropdown
          label="Half"
          value={periodFilter}
          options={periodOptions}
          onChange={onPeriodChange}
        />

        <FilterDropdown
          label="Type"
          value={typeFilter}
          options={typeOptions}
          onChange={onTypeChange}
        />

        {mode === "indirect" && (
          <FilterDropdown
            label="Zone"
            value={zoneFilter}
            options={zoneOptions}
            onChange={onZoneChange}
          />
        )}

        <FilterDropdown
          label="Side"
          value={sideFilter}
          options={sideOptions}
          onChange={onSideChange}
        />

        <FilterDropdown
          label="Technique"
          value={techniqueFilter}
          options={techniqueOptions}
          onChange={onTechniqueChange}
        />

        {mode === "indirect" && (
          <FilterDropdown
            label="Target"
            value={targetFilter}
            options={targetOptions}
            onChange={onTargetChange}
          />
        )}

        <FilterDropdown
          label="Taker"
          value={takerFilter}
          options={takerOptions}
          onChange={onTakerChange}
        />

        <div className="flex items-end">
          <Button variant="outline" size="sm" className="h-8" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetPieceFiltersBar;
