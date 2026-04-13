"use client";

import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RtpStatusBadge } from "@/components/players/rtp-status";

interface InjuredPlayer {
  id: string;
  playerName: string;
  injuryType: string;
  rtpStatus: string;
  daysOut: number;
  expectedReturn: number | null;
}

/**
 * Currently Injured Players widget.
 * Story 14.3 AC #12: Table of all currently injured players.
 */
export default function CurrentlyInjuredTable({
  data,
}: {
  data: InjuredPlayer[];
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Currently Injured</h3>
            <p className="text-muted-foreground text-sm">
              No players currently injured.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Player</TableHead>
                <TableHead className="font-semibold">Injury</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Days Out</TableHead>
                <TableHead className="font-semibold">Expected Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    {player.playerName}
                  </TableCell>
                  <TableCell>{player.injuryType}</TableCell>
                  <TableCell>
                    <RtpStatusBadge status={player.rtpStatus} />
                  </TableCell>
                  <TableCell className="text-right">{player.daysOut}</TableCell>
                  <TableCell>
                    {player.expectedReturn
                      ? format(new Date(player.expectedReturn), "dd/MM/yyyy")
                      : "TBD"}
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
