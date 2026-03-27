import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { calendarEvents } from "./table/calendarEvents";
import { calendarEventSeries } from "./table/calendarEventSeries";
import { calendarEventUsers } from "./table/calendarEventUsers";
import { feedback } from "./table/feedback";
import { invitations } from "./table/invitations";
import { notifications } from "./table/notifications";
import { teams } from "./table/teams";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  calendarEvents,
  calendarEventSeries,
  calendarEventUsers,
  feedback,
  invitations,
  notifications,
  teams,
  users,
});
