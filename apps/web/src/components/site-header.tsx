"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { IconSearch } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/shared/NotificationCenter"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTranslation } from "@/hooks/useTranslation"
import { GlobalSearch } from "@/components/global-search"
import type { Dictionary } from "@/lib/i18n"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/**
 * Error boundary that silently swallows NotificationCenter errors
 * (e.g. when the user has no teamId yet) so they don't crash the whole page.
 */
class NotificationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

function NotificationCenterSafe() {
  return (
    <NotificationErrorBoundary>
      <NotificationCenter />
    </NotificationErrorBoundary>
  )
}
// --- Data-driven breadcrumb config ---

function getRouteLabelMap(t: Dictionary): Record<string, string> {
  return {
    calendar: t.breadcrumbs.calendar,
    documents: t.breadcrumbs.documents,
    players: t.breadcrumbs.players,
    dashboards: t.breadcrumbs.dashboards,
    settings: t.breadcrumbs.settings,
    team: t.breadcrumbs.team,
    dashboard: t.breadcrumbs.dashboard,
  }
}

function getNestedLabelMap(t: Dictionary): Record<string, string> {
  return {
    players: t.breadcrumbs.playerProfile,
    team: t.breadcrumbs.memberDetails,
  }
}

type BreadcrumbEntry = {
  label: string
  href: string
  isCurrentPage: boolean
}

function getBreadcrumbs(pathname: string, t: Dictionary): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean)
  const routeLabels = getRouteLabelMap(t)
  const nestedLabels = getNestedLabelMap(t)

  if (segments.length === 0) {
    return [{ label: t.breadcrumbs.home, href: "/", isCurrentPage: true }]
  }

  const root = segments[0]
  const rootLabel = routeLabels[root] ?? root.charAt(0).toUpperCase() + root.slice(1)

  if (segments.length === 1) {
    return [{ label: rootLabel, href: `/${root}`, isCurrentPage: true }]
  }

  const knownNestedRoutes: Record<string, string> = {
    "players/new": t.breadcrumbs.addPlayer,
  }

  const nestedKey = segments.slice(0, 2).join("/")
  const nestedLabel = knownNestedRoutes[nestedKey]
    ?? nestedLabels[root]
    ?? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)

  return [
    { label: rootLabel, href: `/${root}`, isCurrentPage: false },
    { label: nestedLabel, href: pathname, isCurrentPage: true },
  ]
}

export function SiteHeader() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const breadcrumbs = getBreadcrumbs(pathname, t)
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isCurrentPage ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 text-muted-foreground md:flex"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch className="size-4" />
              <span className="text-sm">{t.common.search}</span>
              <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch className="size-4" />
              <span className="sr-only">Search</span>
            </Button>
            <ThemeToggle />
            <NotificationCenterSafe />
          </div>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
