"use client";

import { useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { TodayDisplay } from "@/components/calendar/TodayDisplay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TodayPage() {
  const [date, setDate] = useState(getTodayMidnight);

  const events = useQuery(api.calendar.queries.getDayEvents, { date });

  const handleMidnightRollover = useCallback(() => {
    setDate(getTodayMidnight());
  }, []);

  return (
    <TodayDisplay
      events={events}
      onMidnightRollover={handleMidnightRollover}
    />
  );
}
