"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import Link from "next/link";
import { Monitor, Plus, CalendarSync } from "lucide-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { CalendarSyncDialog } from "@/components/calendar/CalendarSyncDialog";
import { EventDetail } from "@/components/calendar/EventDetail";
import { DayEventsPanel } from "@/components/calendar/DayEventsPanel";

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // Panel state — only one panel open at a time
  const [selectedEventId, setSelectedEventId] =
    useState<Id<"calendarEvents"> | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  // Current user for role-based UI
  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";

  // Primary data subscription
  const events = useQuery(api.calendar.queries.getMonthEvents, {
    year: selectedMonth.year,
    month: selectedMonth.month,
  });

  // ----- Callbacks -----

  const handleEventClick = useCallback((eventId: string) => {
    setSelectedDate(null);
    setSelectedEventId(eventId as Id<"calendarEvents">);
  }, []);

  const handleDateClick = useCallback((timestamp: number) => {
    setSelectedEventId(null);
    setSelectedDate(timestamp);
  }, []);

  const handleMonthChange = useCallback((year: number, month: number) => {
    setSelectedMonth((prev) => {
      if (prev.year === year && prev.month === month) return prev;
      return { year, month };
    });
  }, []);

  const handleCloseEvent = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const handleCloseDay = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleDayEventClick = useCallback((eventId: string) => {
    setSelectedDate(null);
    setSelectedEventId(eventId as Id<"calendarEvents">);
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            View and manage your team&apos;s schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/calendar/today" target="_blank">
              <Monitor className="mr-2 size-4" />
              TV Display
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsSyncDialogOpen(true)}
          >
            <CalendarSync className="mr-2 size-4" />
            Sync Calendar
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <CalendarView
        events={events}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onMonthChange={handleMonthChange}
      />

      {/* Event detail sheet */}
      <EventDetail
        eventId={selectedEventId}
        open={selectedEventId !== null}
        onClose={handleCloseEvent}
        isAdmin={isAdmin}
      />

      {/* Day events sheet */}
      <DayEventsPanel
        date={selectedDate}
        open={selectedDate !== null}
        onClose={handleCloseDay}
        onEventClick={handleDayEventClick}
      />

      {/* Calendar sync dialog */}
      <CalendarSyncDialog
        open={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
      />

      {/* Create event dialog (admin only) */}
      {isAdmin && (
        <CreateEventDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      )}
    </div>
  );
}
