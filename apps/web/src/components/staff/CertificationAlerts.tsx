"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { format } from "date-fns";
import { IconAlertTriangle } from "@tabler/icons-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type CertificationStatus = "expired" | "expiring" | "valid";

const statusClasses: Record<string, string> = {
  expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expiring:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export function CertificationAlerts() {
  const entries = useQuery(api.staff.queries.getExpiringCertifications);

  const summary = useMemo(() => {
    if (!entries) return null;

    const expired = entries.filter(
      (e) => e.status === "expired",
    ).length;
    const expiring = entries.filter(
      (e) => e.status === "expiring",
    ).length;

    return { expired, expiring, total: entries.length };
  }, [entries]);

  // Loading state
  if (entries === undefined) {
    return <Skeleton className="h-24 w-full" />;
  }

  // Hide entirely if no expiring/expired certifications
  if (entries.length === 0) {
    return null;
  }

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconAlertTriangle className="size-5 text-amber-500" />
              Certification Alerts
              <Badge variant="secondary" className="ml-2">
                {entries.length}
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Summary stats */}
            {summary && (
              <div className="mb-4 flex gap-4">
                {summary.expired > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">
                      Expired: {summary.expired}
                    </span>
                  </div>
                )}
                {summary.expiring > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium">
                      Expiring within 30 days: {summary.expiring}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Issuing Body</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="font-medium">
                      {entry.firstName} {entry.lastName}
                    </TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell>{entry.issuingBody}</TableCell>
                    <TableCell>
                      {entry.expiryDate
                        ? format(
                            new Date(entry.expiryDate),
                            "dd/MM/yyyy",
                          )
                        : "---"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          statusClasses[
                            entry.status as CertificationStatus
                          ] ?? ""
                        }
                      >
                        {entry.status === "expired"
                          ? "Expired"
                          : "Expiring"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
