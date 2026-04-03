"use client";

import { AlertTriangle, CheckCircle, Cross } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UnavailablePlayer } from "./types";

interface UnavailablePlayersProps {
  players: UnavailablePlayer[];
}

export default function UnavailablePlayers({
  players,
}: UnavailablePlayersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unavailable Players</CardTitle>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              No known unavailable players
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {players.map((p, i) => (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2">
                  {p.reason === "suspended" ? (
                    <AlertTriangle className="size-4 text-red-500" />
                  ) : (
                    <Cross className="size-4 text-amber-500" />
                  )}
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {p.position}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{p.detail}</p>
                  {p.expected_return && (
                    <p className="text-xs text-muted-foreground">
                      Return: {p.expected_return}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
