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
  role: string;
  onRoleChange: (value: string) => void;
  roles: string[];
}

export function StaffDirectoryFilters({
  searchValue,
  onSearchChange,
  department,
  onDepartmentChange,
  departments,
  role,
  onRoleChange,
  roles,
}: StaffDirectoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-64 sm:flex-1">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search staff by name..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        value={department || "all"}
        onValueChange={(value) =>
          onDepartmentChange(value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-full sm:w-48">
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

      <Select
        value={role || "all"}
        onValueChange={(value) => onRoleChange(value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((r) => (
            <SelectItem key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
