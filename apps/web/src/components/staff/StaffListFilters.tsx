"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import {
  STAFF_DEPARTMENTS,
  STAFF_STATUS_LABELS,
} from "@packages/shared/staff";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

interface StaffListFiltersProps {
  currentDepartment: string | undefined;
  currentStatus: string | undefined;
  onDepartmentChange: (department: string | undefined) => void;
  onStatusChange: (status: string | undefined) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: STAFF_STATUS_LABELS.active },
  { value: "inactive", label: STAFF_STATUS_LABELS.inactive },
] as const;

export function StaffListFilters({
  currentDepartment,
  currentStatus,
  onDepartmentChange,
  onStatusChange,
  searchValue,
  onSearchChange,
}: StaffListFiltersProps) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = React.useState(searchValue);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync external search value changes
  React.useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={currentStatus ?? "all"}
          onValueChange={(value) =>
            onStatusChange(value === "all" ? undefined : value)
          }
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select
          value={currentDepartment ?? "all"}
          onValueChange={(value) =>
            onDepartmentChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t.staff.filterByDepartment} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.staff.allDepartments}</SelectItem>
            {STAFF_DEPARTMENTS.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative w-full sm:w-64">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder={t.staff.search}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}
