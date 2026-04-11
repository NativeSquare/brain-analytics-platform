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
import {
  INJURY_SEVERITIES,
  INJURY_STATUSES,
  INJURY_STATUS_LABELS,
  BODY_REGIONS,
  BODY_REGION_LABELS,
  INJURY_MECHANISMS,
  INJURY_MECHANISM_LABELS,
  INJURY_SIDES,
  INJURY_SIDE_LABELS,
  LEGACY_STATUS_MAP,
} from "@packages/shared/players";
import type { InjuryStatus } from "@packages/shared/players";

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

/**
 * Map a potentially legacy status value to a valid new status.
 */
function normalizeStatus(status: string): InjuryStatus {
  if ((INJURY_STATUSES as readonly string[]).includes(status)) {
    return status as InjuryStatus;
  }
  return LEGACY_STATUS_MAP[status] ?? "active";
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

  const defaultCreateValues: InjuryEditFormData = {
    date: Date.now(),
    injuryType: "",
    severity: undefined as unknown as InjuryEditFormData["severity"],
    bodyRegion: undefined,
    mechanism: undefined,
    side: undefined,
    expectedReturnDate: undefined,
    estimatedRecovery: "",
    notes: "",
    status: "active" as const,
    clearanceDate: undefined,
    actualReturnDate: undefined,
  };

  function getEditValues(entry: Doc<"playerInjuries">): InjuryEditFormData {
    return {
      date: entry.date,
      injuryType: entry.injuryType,
      severity: entry.severity as InjuryEditFormData["severity"],
      bodyRegion: entry.bodyRegion as InjuryEditFormData["bodyRegion"],
      mechanism: entry.mechanism as InjuryEditFormData["mechanism"],
      side: entry.side as InjuryEditFormData["side"],
      expectedReturnDate: entry.expectedReturnDate,
      estimatedRecovery: entry.estimatedRecovery ?? "",
      notes: entry.notes ?? "",
      status: normalizeStatus(entry.status),
      clearanceDate: entry.clearanceDate,
      actualReturnDate: entry.actualReturnDate,
    };
  }

  // Always use the edit schema (superset) as the resolver
  const form = useForm<InjuryEditFormData>({
    resolver: zodResolver(injuryEditSchema),
    mode: "onChange",
    defaultValues: existingEntry
      ? getEditValues(existingEntry)
      : defaultCreateValues,
  });

  const watchedStatus = form.watch("status");

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset(
        existingEntry
          ? getEditValues(existingEntry)
          : defaultCreateValues
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingEntry]);

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
          bodyRegion: data.bodyRegion,
          mechanism: data.mechanism,
          side: data.side,
          expectedReturnDate: data.expectedReturnDate,
          estimatedRecovery,
          notes,
          status: data.status,
          clearanceDate: data.clearanceDate,
          actualReturnDate: data.actualReturnDate,
        });
        toast.success("Injury updated");
      } else {
        await logInjury({
          playerId,
          date: data.date,
          injuryType: data.injuryType,
          severity: data.severity,
          bodyRegion: data.bodyRegion,
          mechanism: data.mechanism,
          side: data.side,
          expectedReturnDate: data.expectedReturnDate,
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
      <DialogContent className="sm:max-w-lg">
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

            {/* Body Region (Story 14.1) */}
            <Controller
              name="bodyRegion"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>Body Region</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "" ? undefined : val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select body region" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {BODY_REGION_LABELS[region]}
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

            {/* Mechanism (Story 14.1) */}
            <Controller
              name="mechanism"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>Mechanism</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "" ? undefined : val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select mechanism" />
                    </SelectTrigger>
                    <SelectContent>
                      {INJURY_MECHANISMS.map((mech) => (
                        <SelectItem key={mech} value={mech}>
                          {INJURY_MECHANISM_LABELS[mech]}
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

            {/* Side (Story 14.1) */}
            <Controller
              name="side"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>Side</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "" ? undefined : val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select side" />
                    </SelectTrigger>
                    <SelectContent>
                      {INJURY_SIDES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {INJURY_SIDE_LABELS[s]}
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
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
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

            {/* Expected Return Date (Story 14.1) */}
            <Controller
              name="expectedReturnDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>Expected Return Date</FieldLabel>
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

            {/* Edit-only fields: Status + Clearance Date + Actual Return Date */}
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
                        value={field.value ?? "active"}
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Auto-suggest today for actualReturnDate when switching to cleared
                          if (val === "cleared" && !form.getValues("actualReturnDate")) {
                            form.setValue("actualReturnDate", Date.now());
                          }
                          // Backward compat: also auto-set clearanceDate
                          if (val === "cleared" && !form.getValues("clearanceDate")) {
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
                              {INJURY_STATUS_LABELS[st]}
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
                        {watchedStatus === "cleared" && (
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

                {/* Actual Return Date (Story 14.1) */}
                <Controller
                  name="actualReturnDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel>
                        Actual Return Date
                        {watchedStatus === "cleared" && (
                          <span className="text-muted-foreground ml-1 text-xs">(auto-set when cleared)</span>
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
