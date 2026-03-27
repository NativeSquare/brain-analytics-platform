"use client"

import * as React from "react"
import {
  IconCalendar,
  IconChartBar,
  IconFileDescription,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"
import { useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

const data = {
  navMain: [
    {
      title: "Dashboards",
      url: "/dashboards",
      icon: IconChartBar,
    },
    {
      title: "Players",
      url: "/players",
      icon: IconUsersGroup,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: IconCalendar,
    },
    {
      title: "Documents",
      url: "/documents",
      icon: IconFileDescription,
    },
    {
      title: "Team",
      url: "/team",
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const currentUser = useQuery(api.table.users.currentUser)

  const user = currentUser
    ? {
        name: currentUser.name || "User",
        email: currentUser.email || "",
        avatar: currentUser.image || "",
      }
    : null

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Brain Analytics</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={user} />
        ) : (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
