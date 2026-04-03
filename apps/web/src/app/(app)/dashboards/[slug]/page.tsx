"use client";

import { Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { ChevronRight, ShieldAlert } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardComponent } from "@/lib/dashboard-registry";

// ---------------------------------------------------------------------------
// Inner content component
// ---------------------------------------------------------------------------

function DashboardSlugContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const result = useQuery(api.dashboards.queries.getDashboardBySlug, { slug });
  const trackOpen = useMutation(api.userDashboards.trackDashboardOpen);

  // Track dashboard open once the dashboard loads and user has access
  useEffect(() => {
    if (result?.dashboard && result.hasAccess) {
      void trackOpen({ dashboardId: slug });
    }
  }, [result?.dashboard?._id, result?.hasAccess, slug, trackOpen]);

  // Loading
  if (result === undefined) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // 404: dashboard not found
  if (!result.dashboard) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold">Dashboard Not Found</h2>
        <p className="mt-2 text-muted-foreground">
          The dashboard you are looking for does not exist.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboards">Back to Dashboards</Link>
        </Button>
      </div>
    );
  }

  // Access denied
  if (!result.hasAccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <ShieldAlert className="text-muted-foreground mb-4 size-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          You don&apos;t have permission to view this dashboard. Contact your
          admin to request access.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboards">Back to Dashboards</Link>
        </Button>
      </div>
    );
  }

  // Resolve the dashboard component
  const DashboardComponent = getDashboardComponent(slug);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Breadcrumb */}
      <div className="px-4 lg:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboards">Dashboards</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="size-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{result.dashboard.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Dashboard content */}
      <div className="flex flex-1 flex-col px-4 lg:px-6">
        {DashboardComponent ? (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
              </div>
            }
          >
            <DashboardComponent slug={slug} />
          </Suspense>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <h2 className="text-xl font-semibold">
              {result.dashboard.title}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Dashboard component not found in registry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function DashboardSlugPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="px-4 lg:px-6">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <DashboardSlugContent />
    </Suspense>
  );
}
