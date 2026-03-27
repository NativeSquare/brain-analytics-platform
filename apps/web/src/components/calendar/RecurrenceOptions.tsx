"use client";

import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  type RecurrenceFrequency,
} from "@packages/shared/calendar";
import { computeOccurrenceDates } from "@packages/backend/convex/calendar/utils";

import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecurrenceOptionsProps {
  isRecurring: boolean;
  onRecurringChange: (val: boolean) => void;
  frequency: RecurrenceFrequency | undefined;
  onFrequencyChange: (val: RecurrenceFrequency | undefined) => void;
  endDate: number | undefined;
  onEndDateChange: (val: number | undefined) => void;
  startsAt: number | undefined;
  endsAt: number | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurrenceOptions({
  isRecurring,
  onRecurringChange,
  frequency,
  onFrequencyChange,
  endDate,
  onEndDateChange,
  startsAt,
  endsAt,
}: RecurrenceOptionsProps) {
  // Compute occurrence count preview
  const occurrencePreview = useMemo(() => {
    if (!isRecurring || !startsAt || !endsAt || !frequency || !endDate) {
      return null;
    }
    if (endDate <= startsAt) {
      return { error: "Invalid: end date must be after start date" };
    }
    const occurrences = computeOccurrenceDates(
      startsAt,
      endsAt,
      frequency,
      endDate,
    );
    return { count: occurrences.length };
  }, [isRecurring, startsAt, endsAt, frequency, endDate]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      onRecurringChange(checked);
      if (!checked) {
        onFrequencyChange(undefined);
        onEndDateChange(undefined);
      }
    },
    [onRecurringChange, onFrequencyChange, onEndDateChange],
  );

  const endDateAsDate = endDate ? new Date(endDate) : undefined;

  return (
    <div className="space-y-3">
      {/* Recurring toggle */}
      <Field orientation="horizontal">
        <FieldLabel htmlFor="recurring-toggle" className="flex-1">
          Recurring event
        </FieldLabel>
        <Switch
          id="recurring-toggle"
          checked={isRecurring}
          onCheckedChange={handleToggle}
        />
      </Field>

      {isRecurring && (
        <div className="space-y-3 rounded-md border p-3">
          {/* Frequency select */}
          <Field>
            <FieldLabel>Frequency</FieldLabel>
            <Select
              value={frequency ?? ""}
              onValueChange={(val) =>
                onFrequencyChange(val as RecurrenceFrequency)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {RECURRENCE_FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Series end date */}
          <Field>
            <FieldLabel>Series End Date</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {endDateAsDate
                    ? format(endDateAsDate, "PPP")
                    : "Pick an end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateAsDate}
                  onSelect={(day) => {
                    if (day) {
                      // Set to end of day (23:59:59.999) for inclusive range
                      const d = new Date(day);
                      d.setHours(23, 59, 59, 999);
                      onEndDateChange(d.getTime());
                    } else {
                      onEndDateChange(undefined);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>

          {/* Occurrence count preview */}
          {occurrencePreview &&
            ("error" in occurrencePreview ? (
              <p className="text-destructive text-sm">
                {occurrencePreview.error}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                This will create{" "}
                <span className="font-medium">{occurrencePreview.count}</span>{" "}
                events
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
