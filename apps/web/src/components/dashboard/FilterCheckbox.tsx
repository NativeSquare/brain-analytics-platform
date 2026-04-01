"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface FilterCheckboxOption {
  value: string;
  label: string;
}

export interface FilterCheckboxProps {
  options: FilterCheckboxOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label?: string;
  className?: string;
}

export function FilterCheckbox({
  options,
  selectedValues,
  onChange,
  label,
  className,
}: FilterCheckboxProps) {
  const allSelected = options.every((opt) =>
    selectedValues.includes(opt.value),
  );
  const showToggle = options.length > 3;

  const handleToggle = useCallback(
    (optionValue: string, checked: boolean) => {
      if (checked) {
        onChange([...selectedValues, optionValue]);
      } else {
        onChange(selectedValues.filter((v) => v !== optionValue));
      }
    },
    [selectedValues, onChange],
  );

  const handleSelectAllClear = useCallback(() => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  }, [allSelected, onChange, options]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase">{label}</Label>
          {showToggle && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSelectAllClear}
            >
              {allSelected ? "Clear" : "Select All"}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isChecked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleToggle(option.value, checked === true)
                }
              />
              <span className="text-sm">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
