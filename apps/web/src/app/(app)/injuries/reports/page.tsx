"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@packages/backend/convex/_generated/api";

import { InjuryReportByPlayer } from "@/components/injuries/InjuryReportByPlayer";
import { InjuryReportBySeason } from "@/components/injuries/InjuryReportBySeason";
import { InjuryReportByType } from "@/components/injuries/InjuryReportByType";
import { Skeleton } from "@/components/ui/skeleton";

export default function InjuryReportsPage() {
  const router = useRouter();
  const currentUser = useQuery(api.table.users.currentUser);

  // Redirect non-admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/");
    }
  }, [currentUser, router]);

  // Loading state
  if (currentUser === undefined) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Access denied for non-admin
  if (currentUser?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Injury Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aggregate injury data and trends for your team.
        </p>
      </div>

      <InjuryReportByPlayer />
      <InjuryReportBySeason />
      <InjuryReportByType />
    </div>
  );
}
