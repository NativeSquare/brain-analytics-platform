"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconCalendar } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";

import {
  certificationFormSchema,
  type CertificationFormData,
} from "./certificationFormSchema";

interface CertificationEntry {
  _id: Id<"certifications">;
  name: string;
  issuingBody: string;
  issueDate: number;
  expiryDate?: number;
  notes?: string;
}

interface CertificationFormDialogProps {
  staffId: Id<"staff">;
  existingCertification?: CertificationEntry;
  open: boolean;
  onClose: () => void;
}

export function CertificationFormDialog({
  staffId,
  existingCertification,
  open,
  onClose,
}: CertificationFormDialogProps) {
  const isEdit = !!existingCertification;
  const addCertification = useMutation(api.staff.mutations.addCertification);
  const updateCertification = useMutation(
    api.staff.mutations.updateCertification,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CertificationFormData>({
    resolver: zodResolver(certificationFormSchema),
    mode: "onChange",
    defaultValues: existingCertification
      ? {
          name: existingCertification.name,
          issuingBody: existingCertification.issuingBody,
          issueDate: existingCertification.issueDate,
          expiryDate: existingCertification.expiryDate,
          notes: existingCertification.notes ?? "",
        }
      : {
          name: "",
          issuingBody: "",
          issueDate: Date.now(),
          expiryDate: undefined,
          notes: "",
        },
  });

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset(
        existingCertification
          ? {
              name: existingCertification.name,
              issuingBody: existingCertification.issuingBody,
              issueDate: existingCertification.issueDate,
              expiryDate: existingCertification.expiryDate,
              notes: existingCertification.notes ?? "",
            }
          : {
              name: "",
              issuingBody: "",
              issueDate: Date.now(),
              expiryDate: undefined,
              notes: "",
            },
      );
    }
  }, [open, existingCertification, form]);

  const onSubmit = async (data: CertificationFormData) => {
    setIsSubmitting(true);
    const notes =
      data.notes && data.notes.length > 0 ? data.notes : undefined;

    try {
      if (isEdit && existingCertification) {
        await updateCertification({
          certificationId: existingCertification._id,
          name: data.name,
          issuingBody: data.issuingBody,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          notes,
        });
        toast.success("Certification updated");
      } else {
        await addCertification({
          staffId,
          name: data.name,
          issuingBody: data.issuingBody,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          notes,
        });
        toast.success("Certification added");
      }
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to save certification");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Certification" : "Add Certification"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            {/* Name */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="certName">
                    Certification Name{" "}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="certName"
                    placeholder="e.g. UEFA Pro Coaching License"
                    maxLength={200}
                    {...field}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Issuing Body */}
            <Controller
              name="issuingBody"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="issuingBody">
                    Issuing Body{" "}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="issuingBody"
                    placeholder="e.g. UEFA, FA, Red Cross"
                    maxLength={200}
                    {...field}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Issue Date */}
            <Controller
              name="issueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>
                    Issue Date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <IconCalendar className="mr-2 size-4" />
                        {field.value
                          ? format(new Date(field.value), "dd/MM/yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => field.onChange(date?.getTime())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Expiry Date */}
            <Controller
              name="expiryDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>
                    Expiry Date{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <IconCalendar className="mr-2 size-4" />
                          {field.value
                            ? format(new Date(field.value), "dd/MM/yyyy")
                            : "No expiry"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => field.onChange(date?.getTime())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.onChange(undefined)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Notes */}
            <Controller
              name="notes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="certNotes">Notes</FieldLabel>
                  <Textarea
                    id="certNotes"
                    placeholder="Additional details about this certification..."
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
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
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Certification"
              ) : (
                "Add Certification"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
