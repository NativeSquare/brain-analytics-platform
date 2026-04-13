"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery, useConvexAuth } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function NoTeamFallback() {
  const { signOut } = useAuthActions()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Account Setup Incomplete</h1>
      <p className="text-muted-foreground max-w-md">
        Your account is not linked to a team yet. Please accept an invitation
        from your team admin, or sign in with a different account.
      </p>
      <Button onClick={handleSignOut}>
        Sign Out &amp; Sign In
      </Button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const currentUser = useQuery(
    api.table.users.currentUser,
    isAuthenticated ? {} : "skip",
  )

  // Auth still loading
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Authenticated but user data still loading
  if (isAuthenticated && currentUser === undefined) {
    return <LoadingSkeleton />
  }

  // Authenticated but no team → broken state
  if (isAuthenticated && currentUser && !currentUser.teamId) {
    return <NoTeamFallback />
  }

  // Not authenticated → also show fallback (shouldn't normally happen due to auth middleware)
  if (!isAuthenticated) {
    return <NoTeamFallback />
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(61,145,223,0.08)_0,transparent_52%),linear-gradient(to_bottom,transparent_0%,rgba(61,145,223,0.04)_100%)]">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
