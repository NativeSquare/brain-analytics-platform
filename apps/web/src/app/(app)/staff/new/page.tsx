"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";

import { StaffForm, type StaffFormData } from "@/components/staff/StaffForm";
import { useTranslation } from "@/hooks/useTranslation";

export default function AddStaffPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentUser = useQuery(api.table.users.currentUser);
  const createStaff = useMutation(api.staff.mutations.createStaff);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        router.push(`/staff/${staffId}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create staff member";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createStaff, router, t]
  );

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
    </div>
  );
}
