"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { NotificationCenter } from "@/components/shared/NotificationCenter"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// --- Data-driven breadcrumb config ---

const routeLabelMap: Record<string, string> = {
  calendar: "Calendar",
  documents: "Documents",
  players: "Players",
  dashboards: "Dashboards",
  settings: "Settings",
  team: "Team",
  users: "Users",
}

const nestedLabelMap: Record<string, string> = {
  players: "Player Profile",
  team: "Member Details",
  users: "User Details",
}

type BreadcrumbEntry = {
  label: string
  href: string
  isCurrentPage: boolean
}

function getBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: "Home", href: "/", isCurrentPage: true }]
  }

  const root = segments[0]
  const rootLabel = routeLabelMap[root] ?? root.charAt(0).toUpperCase() + root.slice(1)

  if (segments.length === 1) {
    return [{ label: rootLabel, href: `/${root}`, isCurrentPage: true }]
  }

  // Known nested route labels (e.g. /players/new → "Add Player")
  const knownNestedRoutes: Record<string, string> = {
    "players/new": "Add Player",
  }

  const nestedKey = segments.slice(0, 2).join("/")
  const nestedLabel = knownNestedRoutes[nestedKey]
    ?? nestedLabelMap[root]
    ?? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)

  return [
    { label: rootLabel, href: `/${root}`, isCurrentPage: false },
    { label: nestedLabel, href: pathname, isCurrentPage: true },
  ]
}

export function SiteHeader() {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
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
          <NotificationCenter />
        </div>
      </div>
    </header>
  )
}
