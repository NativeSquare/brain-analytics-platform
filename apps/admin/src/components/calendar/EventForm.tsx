"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  createEventSchema,
  EVENT_TYPES,
  type CreateEventFormData,
  type EventType,
} from "@packages/shared/calendar";
import type { UserRole } from "@packages/shared/roles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { EventTypeBadge } from "@/components/shared/EventTypeBadge";
import {
  InvitationSelector,
  type SelectedUser,
} from "@/components/calendar/InvitationSelector";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { cn } from "@/lib/utils";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combine a Date (day) + time string "HH:MM" → Unix timestamp ms */
function combineDateAndTime(date: Date, time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.getTime();
}

/** Default time values */
const DEFAULT_START_TIME = "10:00";
const DEFAULT_END_TIME = "11:00";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const createEvent = useMutation(api.calendar.mutations.createEvent);
  const [isPending, setIsPending] = useState(false);

  // Separate state for date pickers and time inputs
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);

  // Invitation state (managed outside RHF since complex)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: "",
      eventType: undefined,
      startsAt: 0,
      endsAt: 0,
      location: "",
      description: "",
      rsvpEnabled: true,
      invitedRoles: [],
      invitedUserIds: [],
    },
  });

  // Sync date/time pickers → form timestamps
  useEffect(() => {
    if (startDate) {
      form.setValue("startsAt", combineDateAndTime(startDate, startTime), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }, [startDate, startTime, form]);

  useEffect(() => {
    if (endDate) {
      form.setValue("endsAt", combineDateAndTime(endDate, endTime), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }, [endDate, endTime, form]);

  // Auto-set end date to start date + 1 hour when start is first set
  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate);
      // Set end time to 1 hour after start time
      const [h, m] = startTime.split(":").map(Number);
      const endH = Math.min(h + 1, 23);
      setEndTime(`${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }, [startDate, endDate, startTime]);

  // Sync invitation state → form
  useEffect(() => {
    form.setValue("invitedRoles", selectedRoles, {
      shouldValidate: form.formState.isSubmitted,
    });
  }, [selectedRoles, form]);

  useEffect(() => {
    form.setValue(
      "invitedUserIds",
      selectedUsers.map((u) => u._id),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [selectedUsers, form]);

  async function onSubmit(data: CreateEventFormData) {
    setIsPending(true);
    try {
      await createEvent({
        name: data.name,
        eventType: data.eventType,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        location: data.location || undefined,
        description: data.description || undefined,
        rsvpEnabled: data.rsvpEnabled,
        invitedRoles: data.invitedRoles,
        invitedUserIds: data.invitedUserIds as Id<"users">[],
      });
      form.reset();
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
      setSelectedRoles([]);
      setSelectedUsers([]);
      onSuccess();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  function handleCancel() {
    form.reset();
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
    setSelectedRoles([]);
    setSelectedUsers([]);
    onCancel();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FieldGroup>
        {/* Event Name */}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="event-name">Event Name</FieldLabel>
              <Input
                {...field}
                id="event-name"
                placeholder="Event name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Event Type */}
        <Controller
          name="eventType"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Event Type</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <EventTypeBadge type={type as EventType} size="sm" />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Start Date/Time */}
        <Field data-invalid={!!form.formState.errors.startsAt}>
          <FieldLabel>Start Date &amp; Time</FieldLabel>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-[130px]"
            />
          </div>
          {form.formState.errors.startsAt && (
            <FieldError errors={[form.formState.errors.startsAt]} />
          )}
        </Field>

        {/* End Date/Time */}
        <Field data-invalid={!!form.formState.errors.endsAt}>
          <FieldLabel>End Date &amp; Time</FieldLabel>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-[130px]"
            />
          </div>
          {form.formState.errors.endsAt && (
            <FieldError errors={[form.formState.errors.endsAt]} />
          )}
        </Field>

        {/* Location */}
        <Controller
          name="location"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="event-location">Location</FieldLabel>
              <Input
                {...field}
                id="event-location"
                placeholder="Location (optional)"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Description */}
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="event-description">Description</FieldLabel>
              <Textarea
                {...field}
                id="event-description"
                placeholder="Description (optional)"
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* RSVP Toggle */}
        <Controller
          name="rsvpEnabled"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="rsvp-enabled" className="flex-1">
                Enable RSVP
              </FieldLabel>
              <Switch
                id="rsvp-enabled"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />

        {/* Invitations */}
        <div className="space-y-2">
          <FieldLabel>Who to Invite</FieldLabel>
          <InvitationSelector
            selectedRoles={selectedRoles}
            onRolesChange={setSelectedRoles}
            selectedUsers={selectedUsers}
            onUsersChange={setSelectedUsers}
          />
          {form.formState.errors.invitedRoles && (
            <FieldError errors={[form.formState.errors.invitedRoles]} />
          )}
        </div>
      </FieldGroup>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner className="mr-2" /> : null}
          Create Event
        </Button>
      </div>
    </form>
  );
}
