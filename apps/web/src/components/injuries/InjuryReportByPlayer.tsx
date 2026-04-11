"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortField = "playerName" | "totalInjuries" | "totalDaysLost";
type SortDir = "asc" | "desc";

export function InjuryReportByPlayer() {
  const data = useQuery(api.injuries.queries.getInjuryReportByPlayer, {});
  const [sortField, setSortField] = useState<SortField>("totalDaysLost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDir]);

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Injuries per Player</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Injuries per Player</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No injury data available.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("playerName")}
                >
                  Player Name{sortIndicator("playerName")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort("totalInjuries")}
                >
                  Total Injuries{sortIndicator("totalInjuries")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort("totalDaysLost")}
                >
                  Total Days Lost{sortIndicator("totalDaysLost")}
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.playerId}>
                  <TableCell className="font-medium">
                    {row.playerName}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.totalInjuries}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.totalDaysLost}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.currentlyInjured ? (
                      <Badge variant="destructive">Injured</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-transparent"
                      >
                        Available
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
