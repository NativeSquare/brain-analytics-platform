"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id, Doc } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconCalendar } from "@tabler/icons-react";
import { INJURY_SEVERITIES, INJURY_STATUSES } from "@packages/shared/players";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";

import {
  injuryEditSchema,
  type InjuryEditFormData,
} from "./injuryFormSchema";

interface InjuryFormDialogProps {
  playerId: Id<"players">;
  existingEntry?: Doc<"playerInjuries">;
  open: boolean;
  onClose: () => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function InjuryFormDialog({
  playerId,
  existingEntry,
  open,
  onClose,
}: InjuryFormDialogProps) {
  const isEdit = !!existingEntry;
  const logInjury = useMutation(api.players.mutations.logInjury);
  const updateInjury = useMutation(api.players.mutations.updateInjury);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Always use the edit schema (superset) as the resolver — it validates
  // status + clearanceDate fields that are present even in create mode
  // (defaulting to "current" / undefined). This avoids type mismatch.
  const form = useForm<InjuryEditFormData>({
    resolver: zodResolver(injuryEditSchema),
    mode: "onChange",
    defaultValues: existingEntry
      ? {
          date: existingEntry.date,
          injuryType: existingEntry.injuryType,
          severity: existingEntry.severity as InjuryEditFormData["severity"],
          estimatedRecovery: existingEntry.estimatedRecovery ?? "",
          notes: existingEntry.notes ?? "",
          status: existingEntry.status as InjuryEditFormData["status"],
          clearanceDate: existingEntry.clearanceDate,
        }
      : {
          date: Date.now(),
          injuryType: "",
          severity: undefined,
          estimatedRecovery: "",
          notes: "",
          status: "current" as const,
          clearanceDate: undefined,
        },
  });

  const watchedStatus = form.watch("status");

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset(
        existingEntry
          ? {
              date: existingEntry.date,
              injuryType: existingEntry.injuryType,
              severity: existingEntry.severity as InjuryEditFormData["severity"],
              estimatedRecovery: existingEntry.estimatedRecovery ?? "",
              notes: existingEntry.notes ?? "",
              status: existingEntry.status as InjuryEditFormData["status"],
              clearanceDate: existingEntry.clearanceDate,
            }
          : {
              date: Date.now(),
              injuryType: "",
              severity: undefined,
              estimatedRecovery: "",
              notes: "",
              status: "current" as const,
              clearanceDate: undefined,
            }
      );
    }
  }, [open, existingEntry, form]);

  const onSubmit = async (data: InjuryEditFormData) => {
    setIsSubmitting(true);
    // Normalize empty strings to undefined
    const estimatedRecovery =
      data.estimatedRecovery && data.estimatedRecovery.length > 0
        ? data.estimatedRecovery
        : undefined;
    const notes =
      data.notes && data.notes.length > 0 ? data.notes : undefined;

    try {
      if (isEdit && existingEntry) {
        await updateInjury({
          injuryId: existingEntry._id,
          date: data.date,
          injuryType: data.injuryType,
          severity: data.severity,
          estimatedRecovery,
          notes,
          status: data.status,
          clearanceDate: data.clearanceDate,
        });
        toast.success("Injury updated");
      } else {
        await logInjury({
          playerId,
          date: data.date,
          injuryType: data.injuryType,
          severity: data.severity,
          estimatedRecovery,
          notes,
        });
        toast.success("Injury logged");
      }
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to save injury entry");
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
            {isEdit ? "Update Injury" : "Log Injury"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            {/* Date */}
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>
                    Date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
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

            {/* Injury Type */}
            <Controller
              name="injuryType"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="injuryType">
                    Injury Type <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="injuryType"
                    placeholder="e.g. Hamstring strain, ACL tear"
                    maxLength={200}
                    {...field}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Severity */}
            <Controller
              name="severity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>
                    Severity <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {INJURY_SEVERITIES.map((sev) => (
                        <SelectItem key={sev} value={sev}>
                          {capitalize(sev)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Estimated Recovery */}
            <Controller
              name="estimatedRecovery"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="estimatedRecovery">
                    Estimated Recovery
                  </FieldLabel>
                  <Input
                    id="estimatedRecovery"
                    placeholder="e.g. 4-6 weeks, 3 months"
                    maxLength={200}
                    {...field}
                    value={field.value ?? ""}
                  />
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
                  <FieldLabel htmlFor="notes">Notes</FieldLabel>
                  <Textarea
                    id="notes"
                    placeholder="Clinical details, circumstances of injury..."
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

            {/* Edit-only fields: Status + Clearance Date (AC #8) */}
            {isEdit && (
              <>
                {/* Status */}
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel>
                        Status <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={field.value ?? "current"}
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Auto-suggest today for clearance date when switching to recovered
                          if (val === "recovered" && !form.getValues("clearanceDate")) {
                            form.setValue("clearanceDate", Date.now());
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {INJURY_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {capitalize(st)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                {/* Clearance Date */}
                <Controller
                  name="clearanceDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel>
                        Clearance Date
                        {watchedStatus === "recovered" && (
                          <span className="text-muted-foreground ml-1 text-xs">(recommended)</span>
                        )}
                      </FieldLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
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
              </>
            )}
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
                "Update Injury"
              ) : (
                "Log Injury"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
