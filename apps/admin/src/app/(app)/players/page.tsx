"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { IconShirtSport, IconUserPlus } from "@tabler/icons-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerTable } from "@/components/players/PlayerTable";
import { PlayerListFilters } from "@/components/players/PlayerListFilters";

function PlayersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusFilter = searchParams.get("status") ?? undefined;
  const searchFilter = searchParams.get("search") ?? undefined;

  const players = useQuery(api.players.queries.getPlayers, {
    status: statusFilter,
    search: searchFilter,
  });

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/players?${qs}` : "/players");
  };

  const handleStatusChange = (status: string | undefined) => {
    updateFilter("status", status ?? null);
  };

  const handleSearchChange = (value: string) => {
    updateFilter("search", value || null);
  };

  const handlePlayerClick = (playerId: Id<"players">) => {
    router.push(`/players/${playerId}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        <Button variant="outline" disabled>
          <IconUserPlus className="mr-1.5 size-4" />
          Add Player
        </Button>
      </div>

      {/* Filters */}
      <PlayerListFilters
        currentStatus={statusFilter}
        onStatusChange={handleStatusChange}
        searchValue={searchFilter ?? ""}
        onSearchChange={handleSearchChange}
      />

      {/* Player list */}
      {players === undefined ? (
        <PlayerListSkeleton />
      ) : players.length === 0 ? (
        <EmptyState />
      ) : (
        <PlayerTable players={players} onPlayerClick={handlePlayerClick} />
      )}
    </div>
  );
}

function PlayerListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <IconShirtSport className="text-muted-foreground mb-4 size-12" />
      <h2 className="text-lg font-medium">No players yet</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Add your first player to get started.
      </p>
      <Button className="mt-4" disabled>
        <IconUserPlus className="mr-1.5 size-4" />
        Add your first player
      </Button>
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-32" />
          <PlayerListSkeleton />
        </div>
      }
    >
      <PlayersPageContent />
    </Suspense>
  );
}
