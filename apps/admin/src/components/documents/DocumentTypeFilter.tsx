"use client";

import * as React from "react";
import {
  Files,
  FileText,
  Image,
  Table,
  Video,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILE_TYPE_OPTIONS = [
  { value: "", label: "All Types", icon: Files },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "image", label: "Images", icon: Image },
  { value: "spreadsheet", label: "Spreadsheets", icon: Table },
  { value: "video", label: "Video Links", icon: Video },
] as const;

interface DocumentTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function DocumentTypeFilter({
  value,
  onChange,
}: DocumentTypeFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? "" : val)}
    >
      <SelectTrigger className="w-[160px] shrink-0">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent>
        {FILE_TYPE_OPTIONS.map((option) => (
          <SelectItem
            key={option.value || "all"}
            value={option.value || "all"}
          >
            <option.icon className="size-4" />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
