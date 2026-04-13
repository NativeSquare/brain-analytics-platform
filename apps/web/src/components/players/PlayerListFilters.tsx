"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { PLAYER_STATUS_LABELS } from "@packages/shared/players";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerListFiltersProps {
  currentStatus: string | undefined;
  onStatusChange: (status: string | undefined) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: PLAYER_STATUS_LABELS.active },
  { value: "onLoan", label: PLAYER_STATUS_LABELS.onLoan },
  { value: "leftClub", label: PLAYER_STATUS_LABELS.leftClub },
] as const;

export function PlayerListFilters({
  currentStatus,
  onStatusChange,
  searchValue,
  onSearchChange,
}: PlayerListFiltersProps) {
  const [localSearch, setLocalSearch] = React.useState(searchValue);

  // Debounce search input by 300ms (AC #9)
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

      <div className="relative w-full sm:w-64">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search players..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-white pl-8 dark:bg-card"
        />
      </div>
    </div>
  );
}
