"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";

import { StaffForm, type StaffFormData } from "@/components/staff/StaffForm";
import { InviteStaffDialog } from "@/components/staff/InviteStaffDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface InviteDialogState {
  open: boolean;
  staffId: string | null;
  firstName: string;
  lastName: string;
  email: string | undefined;
  department: string;
}

export default function AddStaffPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentUser = useQuery(api.table.users.currentUser);
  const createStaff = useMutation(api.staff.mutations.createStaff);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inviteDialog, setInviteDialog] = React.useState<InviteDialogState>({
    open: false,
    staffId: null,
    firstName: "",
    lastName: "",
    email: undefined,
    department: "",
  });

  const handleSubmit = React.useCallback(
    async (data: StaffFormData) => {
      setIsSubmitting(true);
      try {
        const staffId = await createStaff({
          firstName: data.firstName,
          lastName: data.lastName,
          photo: data.photo,
          jobTitle: data.jobTitle,
          department: data.department,
          phone: data.phone,
          email: data.email,
          bio: data.bio,
          dateJoined: data.dateJoined,
        });
        toast.success(t.staff.toast.created);
        // Open invite dialog instead of navigating immediately
        setInviteDialog({
          open: true,
          staffId: staffId as string,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          department: data.department,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create staff member";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createStaff, t]
  );

  const handleInviteClose = React.useCallback(() => {
    setInviteDialog((prev) => ({ ...prev, open: false }));
    if (inviteDialog.staffId) {
      router.push(`/staff/${inviteDialog.staffId}`);
    }
  }, [inviteDialog.staffId, router]);

  // Auth guard: redirect non-admin users
  if (currentUser !== undefined && currentUser?.role !== "admin") {
    router.replace("/staff");
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{t.staff.newStaff}</h1>
      <div className="mx-auto w-full max-w-3xl">
        <StaffForm
          onSubmit={handleSubmit}
          submitLabel={t.common.create}
          isSubmitting={isSubmitting}
        />
      </div>

      <InviteStaffDialog
        firstName={inviteDialog.firstName}
        lastName={inviteDialog.lastName}
        email={inviteDialog.email}
        department={inviteDialog.department}
        open={inviteDialog.open}
        onClose={handleInviteClose}
      />
    </div>
  );
}
