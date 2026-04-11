"use client";

import * as React from "react";
import { format } from "date-fns";
import { IconAward, IconInfoCircle, IconPencil } from "@tabler/icons-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { CertificationLog } from "./CertificationLog";
import { StaffProfileEditDialog } from "./StaffProfileEditDialog";

interface StaffData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  phone?: string;
  email?: string;
  bio?: string;
  dateJoined?: number;
  status: string;
  userId?: Id<"users">;
}

interface StaffProfileTabsProps {
  staff: StaffData;
  isAdmin: boolean;
  currentUserId?: Id<"users">;
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 font-medium">{value ?? "---"}</dd>
    </div>
  );
}

function PlaceholderTab({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="text-muted-foreground mb-4 size-12" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function StaffProfileTabs({
  staff,
  isAdmin,
  currentUserId,
}: StaffProfileTabsProps) {
  const { t } = useTranslation();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Determine if the current user is viewing their own profile
  const isSelf =
    !!currentUserId && !!staff.userId && currentUserId === staff.userId;

  // Determine if the current user can edit certifications (admin or self)
  const canEditCertifications = isAdmin || isSelf;

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">
          {t.staff.tabs.overview}
        </TabsTrigger>
        <TabsTrigger value="certifications">
          {t.staff.tabs.certifications}
        </TabsTrigger>
        <TabsTrigger value="roleInfo">
          {t.staff.tabs.roleInfo}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardContent className="pt-6">
            {/* Story 13.4 AC #3: Self-view Edit Profile button */}
            {isSelf && (
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <IconPencil className="mr-1 size-4" />
                  Edit Profile
                </Button>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField
                label={t.staff.fields.jobTitle}
                value={staff.jobTitle}
              />
              <InfoField
                label={t.staff.fields.department}
                value={staff.department}
              />
              <InfoField
                label={t.staff.fields.phone}
                value={staff.phone}
              />
              <InfoField
                label={t.staff.fields.email}
                value={staff.email}
              />
              <InfoField
                label={t.staff.fields.dateJoined}
                value={
                  staff.dateJoined
                    ? format(new Date(staff.dateJoined), "PPP")
                    : undefined
                }
              />
            </dl>
            {staff.bio && (
              <div className="mt-6">
                <dt className="text-muted-foreground text-sm">
                  {t.staff.fields.bio}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {staff.bio}
                </dd>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Self-service edit dialog */}
        {isSelf && (
          <StaffProfileEditDialog
            staff={{
              phone: staff.phone,
              email: staff.email,
              bio: staff.bio,
            }}
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
          />
        )}
      </TabsContent>

      <TabsContent value="certifications">
        {staff.userId ? (
          <CertificationLog
            staffId={staff.userId}
            canEdit={canEditCertifications}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <PlaceholderTab
                icon={IconAward}
                message="This staff member is not linked to a user account. Certifications require a user account."
              />
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="roleInfo">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField
                label="Role"
                value={staff.userId ? "Staff" : "---"}
              />
              <InfoField
                label={t.staff.fields.department}
                value={staff.department}
              />
              <InfoField
                label={t.staff.fields.jobTitle}
                value={staff.jobTitle}
              />
            </dl>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
