"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface DocumentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export const DocumentSearchBar = React.forwardRef<
  HTMLInputElement,
  DocumentSearchBarProps
>(function DocumentSearchBar({ value, onChange, onClear }, ref) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Merge forwarded ref with internal ref
  React.useImperativeHandle(ref, () => inputRef.current!);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClear();
        inputRef.current?.blur();
      }
    },
    [onClear],
  );

  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search documents..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-8 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
      {/* Keyboard hint — desktop only */}
      {!value && (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          /
        </kbd>
      )}
    </div>
  );
});
