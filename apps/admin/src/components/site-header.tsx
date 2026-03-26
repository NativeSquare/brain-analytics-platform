"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { IconBell } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  calendar: "Details",
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

  // Nested route: e.g. /players/abc123 or /calendar/today
  const nestedLabel = nestedLabelMap[root] ?? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)

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
              <span key={crumb.href} className="flex items-center gap-1.5">
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
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <IconBell className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
