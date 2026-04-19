"use client"

import * as React from "react"
import {
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconFileDescription,
  IconHome,
  IconInnerShadowTop,
  IconReportMedical,
  IconUsers,
  IconUsersGroup,
  IconUserCircle,
} from "@tabler/icons-react"
import { useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"

import { useTranslation } from "@/hooks/useTranslation"
import { useOwnStaffProfile } from "@/hooks/useOwnStaffProfile"
import { NavMain } from "@/components/nav-main"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const currentUser = useQuery(api.table.users.currentUser)
  const ownStaffProfile = useOwnStaffProfile()

  const navMain = [
    {
      title: t.nav.home,
      url: "/",
      icon: IconHome,
    },
    {
      title: t.nav.dashboards,
      url: "/dashboards",
      icon: IconChartBar,
    },
    {
      title: t.nav.players,
      url: "/players",
      icon: IconUsersGroup,
    },
    {
      title: t.nav.staff,
      url: "/staff",
      icon: IconBriefcase,
    },
    // Story 13.4 AC #13: "My Profile" link for staff with linked profile
    ...(ownStaffProfile
      ? [
          {
            title: "My Profile",
            url: `/staff/${ownStaffProfile._id}`,
            icon: IconUserCircle,
          },
        ]
      : []),
    {
      title: t.nav.calendar,
      url: "/calendar",
      icon: IconCalendar,
    },
    {
      title: t.nav.documents,
      url: "/documents",
      icon: IconFileDescription,
    },
    {
      title: t.nav.team,
      url: "/team",
      icon: IconUsers,
    },
    // Story 14.4 AC #9: Admin-only Injury Reports link
    ...(currentUser?.role === "admin"
      ? [
          {
            title: "Injury Reports",
            url: "/injuries/reports",
            icon: IconReportMedical,
          },
        ]
      : []),
  ]

  const user = currentUser
    ? {
        name: currentUser.fullName || currentUser.name || "Your Profile",
        email: currentUser.email || "",
        avatar: currentUser.avatarUrl || currentUser.image || "",
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
        <NavMain items={navMain} />
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
