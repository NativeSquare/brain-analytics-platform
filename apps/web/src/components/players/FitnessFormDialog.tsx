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

import { fitnessFormSchema, type FitnessFormData } from "./fitnessFormSchema";

interface FitnessFormDialogProps {
  playerId: Id<"players">;
  existingEntry?: Doc<"playerFitness">;
  open: boolean;
  onClose: () => void;
}

export function FitnessFormDialog({
  playerId,
  existingEntry,
  open,
  onClose,
}: FitnessFormDialogProps) {
  const isEdit = !!existingEntry;
  const addFitness = useMutation(api.players.mutations.addPlayerFitness);
  const updateFitness = useMutation(
    api.players.mutations.updatePlayerFitness
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FitnessFormData>({
    resolver: zodResolver(fitnessFormSchema),
    mode: "onChange",
    defaultValues: existingEntry
      ? {
          date: existingEntry.date,
          weightKg: existingEntry.weightKg,
          bodyFatPercentage: existingEntry.bodyFatPercentage,
          notes: existingEntry.notes ?? "",
        }
      : {
          date: Date.now(),
          weightKg: undefined,
          bodyFatPercentage: undefined,
          notes: "",
        },
  });

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset(
        existingEntry
          ? {
              date: existingEntry.date,
              weightKg: existingEntry.weightKg,
              bodyFatPercentage: existingEntry.bodyFatPercentage,
              notes: existingEntry.notes ?? "",
            }
          : {
              date: Date.now(),
              weightKg: undefined,
              bodyFatPercentage: undefined,
              notes: "",
            }
      );
    }
  }, [open, existingEntry, form]);

  const onSubmit = async (data: FitnessFormData) => {
    setIsSubmitting(true);
    // Normalize empty notes to undefined
    const payload = {
      ...data,
      notes: data.notes && data.notes.length > 0 ? data.notes : undefined,
    };
    try {
      if (isEdit && existingEntry) {
        await updateFitness({ fitnessId: existingEntry._id, ...payload });
        toast.success("Fitness entry updated");
      } else {
        await addFitness({ playerId, ...payload });
        toast.success("Fitness entry added");
      }
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to save fitness entry");
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
            {isEdit ? "Edit Fitness Entry" : "Add Fitness Entry"}
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
                          ? format(new Date(field.value), "dd MMM yyyy")
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

            {/* Weight (kg) */}
            <Controller
              name="weightKg"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="weightKg">Weight (kg)</FieldLabel>
                  <Input
                    id="weightKg"
                    type="number"
                    step={0.1}
                    min={30}
                    max={200}
                    placeholder="e.g. 82.5"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Normalize to 1 decimal place (AC #5, risk mitigation)
                      field.onChange(
                        val === "" ? undefined : Math.round(Number(val) * 10) / 10
                      );
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Body Fat (%) */}
            <Controller
              name="bodyFatPercentage"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="bodyFatPercentage">
                    Body Fat (%)
                  </FieldLabel>
                  <Input
                    id="bodyFatPercentage"
                    type="number"
                    step={0.1}
                    min={1}
                    max={60}
                    placeholder="e.g. 12.3"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Normalize to 1 decimal place (AC #5, risk mitigation)
                      field.onChange(
                        val === "" ? undefined : Math.round(Number(val) * 10) / 10
                      );
                    }}
                    aria-invalid={fieldState.invalid}
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
                  <FieldLabel htmlFor="notes">Notes / Test Results</FieldLabel>
                  <Textarea
                    id="notes"
                    placeholder="e.g. Pre-season fitness test results"
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

            <p className="text-muted-foreground text-xs">
              At least one measurement or note is required.
            </p>
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
                "Update Entry"
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
