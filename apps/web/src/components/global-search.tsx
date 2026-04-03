"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  IconLayoutDashboard,
  IconFileText,
  IconUsers,
  IconCalendar,
  IconContract,
  IconSearch,
  IconLoader2,
} from "@tabler/icons-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchResultItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconLayoutDashboard,
  IconFileText,
  IconUsers,
  IconCalendar,
  IconContract,
};

// GROUP_LABELS moved inside component to use translations

// ---------------------------------------------------------------------------
// Hook: useDebounce
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ---------------------------------------------------------------------------
// GlobalSearch Component
// ---------------------------------------------------------------------------

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");

  const GROUP_LABELS: Record<string, string> = {
    dashboards: t.search.dashboards,
    documents: t.search.documents,
    players: t.search.players,
    calendarEvents: t.search.calendarEvents,
    contracts: t.search.contracts,
  };
  const debouncedSearch = useDebounce(search, 200);

  const results = useQuery(
    api.search.queries.globalSearch,
    debouncedSearch.trim().length >= 2
      ? { searchTerm: debouncedSearch }
      : "skip"
  );

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        // Don't trigger inside inputs/textareas/contenteditable
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const isLoading =
    debouncedSearch.trim().length >= 2 && results === undefined;
  const hasResults =
    results &&
    Object.values(results).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
  const showMinCharsHint = search.trim().length > 0 && search.trim().length < 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Global Search"
      description="Search across dashboards, documents, players, calendar events, and contracts."
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={t.search.placeholder}
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {showMinCharsHint && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t.search.typeToSearch}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              {t.search.searching}
            </div>
          )}

          {!isLoading &&
            !showMinCharsHint &&
            debouncedSearch.trim().length >= 2 &&
            !hasResults && <CommandEmpty>{t.search.noResults}</CommandEmpty>}

          {results &&
            (
              Object.entries(results) as [
                string,
                SearchResultItem[],
              ][]
            ).map(([groupKey, items]) => {
              if (!items || items.length === 0) return null;
              return (
                <CommandGroup
                  key={groupKey}
                  heading={GROUP_LABELS[groupKey] ?? groupKey}
                >
                  {items.map((item) => {
                    const Icon = ICON_MAP[item.icon] ?? IconSearch;
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item.href)}
                      >
                        <Icon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
