"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import { AdminTable } from "@/components/app/dashboard/admin-table";
import { PendingInvites } from "@/components/app/dashboard/pending-invites";
import { InviteDialog } from "@/components/app/dashboard/invite-dialog";
import { AdminDashboardsTab } from "@/components/app/dashboard/admin-dashboards-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeamPage() {
  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-muted-foreground text-sm">
              Manage your team members and invitations.
            </p>
          </div>
          <InviteDialog />
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {isAdmin ? (
          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4 pt-4">
              <PendingInvites />
              <AdminTable />
            </TabsContent>

            <TabsContent value="dashboards" className="pt-4">
              <AdminDashboardsTab />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <PendingInvites />
            <AdminTable />
          </div>
        )}
      </div>
    </div>
  );
}
