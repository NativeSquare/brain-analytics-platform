"use client"

import { useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { IconUserCircle } from "@tabler/icons-react"

import { ProfileForm } from "@/components/app/settings/profile-form"
import { useTranslation } from "@/hooks/useTranslation"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  coach: "bg-green-500/15 text-green-700 dark:text-green-400",
  analyst: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  physio: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  player: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  staff: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  analyst: "Analyst",
  physio: "Physio/Medical",
  player: "Player",
  staff: "Staff",
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const profile = useQuery(api.users.queries.currentUserProfile)

  if (profile === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-60" />
        </div>
      </div>
    )
  }

  if (profile === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">
          {t.account.loginRequired}
        </p>
      </div>
    )
  }

  const isAdmin = profile.role === "admin"

  const roleBadge = profile.role ? (
    <Badge
      variant="secondary"
      className={ROLE_COLORS[profile.role] ?? ""}
    >
      {ROLE_LABELS[profile.role] ?? profile.role}
    </Badge>
  ) : (
    <Badge variant="outline">{t.account.noRole}</Badge>
  )

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.account.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.account.manageProfile}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUserCircle className="size-4" />
              {t.account.profile}
            </CardTitle>
            <CardDescription>
              {t.account.profileDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              fullName={profile.fullName ?? ""}
              avatarUrl={profile.avatarUrl}
              preferredLanguage={profile.preferredLanguage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.account.access}</CardTitle>
            <CardDescription>
              {t.account.accessDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">{t.account.teamLabel}</p>
              <p className="text-muted-foreground">
                {profile.teamName ?? t.account.noTeam}
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium">{t.account.role}</p>
              <div className="flex flex-wrap gap-1">{roleBadge}</div>
            </div>
            <div>
              <p className="font-medium">{t.account.admin}</p>
              <p className="text-muted-foreground">
                {isAdmin ? t.common.yes : t.common.no}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
