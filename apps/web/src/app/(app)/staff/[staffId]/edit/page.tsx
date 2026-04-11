"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffForm, type StaffFormData } from "@/components/staff/StaffForm";
import { useTranslation } from "@/hooks/useTranslation";

interface EditStaffPageProps {
  params: Promise<{ staffId: string }>;
}

export default function EditStaffPage({ params }: EditStaffPageProps) {
  const { staffId } = use(params);
  const typedStaffId = staffId as Id<"staff">;
  const router = useRouter();
  const { t } = useTranslation();

  const staff = useQuery(api.staff.queries.getStaffById, {
    staffId: typedStaffId,
  });
  const currentUser = useQuery(api.table.users.currentUser);
  const updateStaff = useMutation(api.staff.mutations.updateStaff);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (data: StaffFormData) => {
      setIsSubmitting(true);
      try {
        await updateStaff({
          staffId: typedStaffId,
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
        toast.success(t.staff.toast.updated);
        router.push(`/staff/${staffId}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update staff member";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [updateStaff, typedStaffId, staffId, router, t]
  );

  // Auth guard
  if (currentUser !== undefined && currentUser?.role !== "admin") {
    router.replace(`/staff/${staffId}`);
    return null;
  }

  // Loading
  if (staff === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-32" />
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (staff === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <h2 className="text-lg font-medium">{t.staff.notFound}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t.staff.notFoundDescription}
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/staff">
            <IconArrowLeft className="mr-1.5 size-4" />
            {t.staff.backToStaff}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={`/staff/${staffId}`}>
          <IconArrowLeft className="mr-1 size-4" />
          {t.staff.backToStaff}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">{t.staff.editStaff}</h1>
      <div className="mx-auto w-full max-w-3xl">
        <StaffForm
          initialData={{
            firstName: staff.firstName,
            lastName: staff.lastName,
            photo: staff.photo ?? undefined,
            jobTitle: staff.jobTitle,
            department: staff.department,
            phone: staff.phone ?? undefined,
            email: staff.email ?? undefined,
            bio: staff.bio ?? undefined,
            dateJoined: staff.dateJoined ?? undefined,
          }}
          onSubmit={handleSubmit}
          submitLabel={t.common.save}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
