"use client";

import { Suspense, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { IconShirtSport, IconUserPlus } from "@tabler/icons-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PlayerCardGrid } from "@/components/players/PlayerCardGrid";
import { PlayerListFilters } from "@/components/players/PlayerListFilters";
import type { PlayerSummary } from "@/components/players/PlayerTable";

function PlayersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusFilter = searchParams.get("status") ?? undefined;
  const searchFilter = searchParams.get("search") ?? undefined;

  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";

  const players = useQuery(api.players.queries.getPlayers, {
    status: statusFilter,
    search: searchFilter,
  });

  // Keep a ref to searchParams so useCallback closures always read the latest value
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `/players?${qs}` : "/players");
    },
    [router]
  );

  const handleStatusChange = useCallback(
    (status: string | undefined) => {
      updateFilter("status", status ?? null);
    },
    [updateFilter]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilter("search", value || null);
    },
    [updateFilter]
  );

  const handlePlayerClick = useCallback(
    (playerId: Id<"players">) => {
      router.push(`/players/${playerId}`);
    },
    [router]
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/players/new">
              <IconUserPlus className="mr-1.5 size-4" />
              Add Player
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <PlayerListFilters
        currentStatus={statusFilter}
        onStatusChange={handleStatusChange}
        searchValue={searchFilter ?? ""}
        onSearchChange={handleSearchChange}
      />

      {/* Squad summary badges */}
      {players && players.length > 0 && (
        <SquadSummary players={players} />
      )}

      {/* Player list */}
      {players === undefined ? (
        <PlayerListSkeleton />
      ) : players.length === 0 ? (
        <EmptyState isAdmin={isAdmin} />
      ) : (
        <PlayerCardGrid players={players} onPlayerClick={handlePlayerClick} />
      )}
    </div>
  );
}

function SquadSummary({ players }: { players: PlayerSummary[] }) {
  const { isAuthenticated } = useConvexAuth();
  const playerIds = players.map((p) => p._id);
  const rtpStatuses = useQuery(
    api.players.queries.getPlayersRtpStatuses,
    isAuthenticated && playerIds.length > 0 ? { playerIds } : "skip",
  );

  const counts = useMemo(() => {
    const result = { available: 0, rehab: 0, assessment: 0, active: 0 };
    for (const p of players) {
      const status = (rtpStatuses as Record<string, string | null> | undefined)?.[p._id] ?? "available";
      const key = (!status || status === "available") ? "available" : status;
      if (key in result) {
        result[key as keyof typeof result]++;
      } else {
        result.available++;
      }
    }
    return result;
  }, [players, rtpStatuses]);

  const total = players.length;

  const categories = [
    { count: counts.available, label: "Available", color: "bg-green-500" },
    { count: counts.rehab, label: "Modified", color: "bg-amber-400" },
    { count: counts.assessment, label: "Rehab", color: "bg-orange-500" },
    { count: counts.active, label: "Injured", color: "bg-red-500" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {categories.map((cat) =>
        cat.count > 0 ? (
          <span key={cat.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", cat.color)} />
            <span className="font-medium">{cat.count} {cat.label}</span>
          </span>
        ) : null,
      )}
      <span className="text-muted-foreground">· {total} total</span>
    </div>
  );
}

function PlayerListSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-1 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-lg border p-4"
              >
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <IconShirtSport className="text-muted-foreground mb-4 size-12" />
      <h2 className="text-lg font-medium">No players yet</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {isAdmin
          ? "Add your first player to get started."
          : "No players have been added to this team yet."}
      </p>
      {isAdmin && (
        <Button className="mt-4" asChild>
          <Link href="/players/new">
            <IconUserPlus className="mr-1.5 size-4" />
            Add your first player
          </Link>
        </Button>
      )}
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
