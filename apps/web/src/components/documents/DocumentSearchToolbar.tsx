"use client";

import * as React from "react";

import { DocumentSearchBar } from "./DocumentSearchBar";
import { DocumentTypeFilter } from "./DocumentTypeFilter";

interface DocumentSearchToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  fileType: string;
  onFileTypeChange: (value: string) => void;
}

export function DocumentSearchToolbar({
  searchTerm,
  onSearchChange,
  fileType,
  onFileTypeChange,
}: DocumentSearchToolbarProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Global "/" keyboard shortcut to focus the search bar
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only activate if no input/textarea/select is focused
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = React.useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <DocumentSearchBar
        ref={searchRef}
        value={searchTerm}
        onChange={onSearchChange}
        onClear={handleClear}
      />
      <DocumentTypeFilter value={fileType} onChange={onFileTypeChange} />
    </div>
  );
}
