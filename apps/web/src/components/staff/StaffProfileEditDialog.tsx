"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

import {
  staffProfileEditSchema,
  type StaffProfileEditFormData,
} from "./staffProfileEditSchema";

interface StaffProfileEditDialogProps {
  staff: {
    phone?: string;
    email?: string;
    bio?: string;
  };
  open: boolean;
  onClose: () => void;
}

/**
 * Self-service profile edit dialog for staff members.
 *
 * Story 13.4 AC #3: Only phone, email, and bio are editable.
 * Story 13.4 AC #7: Shows success toast and closes on save.
 */
export function StaffProfileEditDialog({
  staff,
  open,
  onClose,
}: StaffProfileEditDialogProps) {
  const updateOwnProfile = useMutation(
    api.staff.mutations.updateOwnStaffProfile
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<StaffProfileEditFormData>({
    resolver: zodResolver(staffProfileEditSchema),
    defaultValues: {
      phone: staff.phone ?? "",
      email: staff.email ?? "",
      bio: staff.bio ?? "",
    },
  });

  // Reset form when dialog opens with fresh staff data.
  // Only depend on `open` — captures latest `staff` at open-time without
  // resetting mid-edit when Convex pushes an unrelated update.
  const staffRef = React.useRef(staff);
  staffRef.current = staff;

  React.useEffect(() => {
    if (open) {
      const s = staffRef.current;
      form.reset({
        phone: s.phone ?? "",
        email: s.email ?? "",
        bio: s.bio ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: StaffProfileEditFormData) => {
    setIsSubmitting(true);
    try {
      // Clean empty strings to undefined for the mutation
      const fields = {
        phone: data.phone || undefined,
        email: data.email || undefined,
        bio: data.bio || undefined,
      };

      await updateOwnProfile(fields);
      toast.success("Profile updated");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to update profile");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="sp-phone">Phone</FieldLabel>
                    <Input
                      {...field}
                      id="sp-phone"
                      type="tel"
                      placeholder="e.g. +44 7700 900000"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="sp-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="sp-email"
                      type="email"
                      placeholder="e.g. name@email.com"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="bio"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="sp-bio">Bio</FieldLabel>
                  <Textarea
                    {...field}
                    id="sp-bio"
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
