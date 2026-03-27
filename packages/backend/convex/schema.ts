import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { calendarEvents } from "./table/calendarEvents";
import { calendarEventSeries } from "./table/calendarEventSeries";
import { calendarEventUsers } from "./table/calendarEventUsers";
import { documentReads } from "./table/documentReads";
import { documentUserPermissions } from "./table/documentUserPermissions";
import { documents } from "./table/documents";
import { eventRsvps } from "./table/eventRsvps";
import { feedback } from "./table/feedback";
import { folders } from "./table/folders";
import { invitations } from "./table/invitations";
import { notifications } from "./table/notifications";
import { playerFitness } from "./table/playerFitness";
import { playerInjuries } from "./table/playerInjuries";
import { playerStats } from "./table/playerStats";
import { players } from "./table/players";
import { teams } from "./table/teams";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  calendarEvents,
  calendarEventSeries,
  calendarEventUsers,
  documentReads,
  documentUserPermissions,
  documents,
  eventRsvps,
  feedback,
  folders,
  invitations,
  notifications,
  playerFitness,
  playerInjuries,
  playerStats,
  players,
  teams,
  users,
});
