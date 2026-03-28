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

import { statsFormSchema, type StatsFormData } from "./statsFormSchema";

interface StatsFormDialogProps {
  playerId: Id<"players">;
  existingStats?: Doc<"playerStats">;
  open: boolean;
  onClose: () => void;
}

export function StatsFormDialog({
  playerId,
  existingStats,
  open,
  onClose,
}: StatsFormDialogProps) {
  const isEdit = !!existingStats;
  const addStats = useMutation(api.players.mutations.addPlayerStats);
  const updateStats = useMutation(api.players.mutations.updatePlayerStats);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<StatsFormData>({
    resolver: zodResolver(statsFormSchema),
    defaultValues: existingStats
      ? {
          matchDate: existingStats.matchDate,
          opponent: existingStats.opponent,
          minutesPlayed: existingStats.minutesPlayed,
          goals: existingStats.goals,
          assists: existingStats.assists,
          yellowCards: existingStats.yellowCards,
          redCards: existingStats.redCards,
        }
      : {
          matchDate: Date.now(),
          opponent: "",
          minutesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
  });

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset(
        existingStats
          ? {
              matchDate: existingStats.matchDate,
              opponent: existingStats.opponent,
              minutesPlayed: existingStats.minutesPlayed,
              goals: existingStats.goals,
              assists: existingStats.assists,
              yellowCards: existingStats.yellowCards,
              redCards: existingStats.redCards,
            }
          : {
              matchDate: Date.now(),
              opponent: "",
              minutesPlayed: 0,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
            }
      );
    }
  }, [open, existingStats, form]);

  const onSubmit = async (data: StatsFormData) => {
    setIsSubmitting(true);
    try {
      if (isEdit && existingStats) {
        await updateStats({ statsId: existingStats._id, ...data });
        toast.success("Match stats updated");
      } else {
        await addStats({ playerId, ...data });
        toast.success("Match stats added");
      }
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to save stats");
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
            {isEdit ? "Edit Match Stats" : "Add Match Stats"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            {/* Match Date */}
            <Controller
              name="matchDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel>
                    Match Date <span className="text-destructive">*</span>
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

            {/* Opponent */}
            <Controller
              name="opponent"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="opponent">
                    Opponent <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="opponent"
                    placeholder="e.g. Manchester City"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Minutes Played */}
            <Controller
              name="minutesPlayed"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="minutesPlayed">
                    Minutes Played <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="minutesPlayed"
                    type="number"
                    min={0}
                    max={120}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? "" : Number(val));
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Goals & Assists */}
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="goals"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="goals">Goals</FieldLabel>
                    <Input
                      id="goals"
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="assists"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="assists">Assists</FieldLabel>
                    <Input
                      id="assists"
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            {/* Yellow Cards & Red Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="yellowCards"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="yellowCards">Yellow Cards</FieldLabel>
                    <Input
                      id="yellowCards"
                      type="number"
                      min={0}
                      max={2}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="redCards"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="redCards">Red Cards</FieldLabel>
                    <Input
                      id="redCards"
                      type="number"
                      min={0}
                      max={1}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
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
              ) : isEdit ? (
                "Update Stats"
              ) : (
                "Add Stats"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
