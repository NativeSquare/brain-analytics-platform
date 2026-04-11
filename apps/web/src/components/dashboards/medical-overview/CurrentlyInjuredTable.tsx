"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RtpStatusBadge } from "@/components/players/rtp-status";
import { mockCurrentlyInjured } from "./mock-data";

/**
 * Currently Injured Players widget.
 * Story 14.3 AC #12: Table of all currently injured players.
 */
export default function CurrentlyInjuredTable() {
  // Sort by days out descending (longest injury first)
  const sorted = [...mockCurrentlyInjured].sort(
    (a, b) => b.daysOut - a.daysOut
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currently Injured</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Injury</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Days Out</TableHead>
              <TableHead>Expected Return</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">
                  {player.playerName}
                </TableCell>
                <TableCell>{player.injuryType}</TableCell>
                <TableCell>
                  <RtpStatusBadge status={player.rtpStatus} />
                </TableCell>
                <TableCell className="text-right">{player.daysOut}</TableCell>
                <TableCell>{player.expectedReturn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
