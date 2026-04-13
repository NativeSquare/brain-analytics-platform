"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffDirectoryFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
}

export function StaffDirectoryFilters({
  searchValue,
  onSearchChange,
  department,
  onDepartmentChange,
  departments,
}: StaffDirectoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-64 sm:flex-1">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search staff by name..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white pl-8 dark:bg-card"
        />
      </div>

      <Select
        value={department || "all"}
        onValueChange={(value) =>
          onDepartmentChange(value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-full bg-white dark:bg-card sm:w-48">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
