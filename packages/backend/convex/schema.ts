import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { certifications } from "./table/certifications";
import { contracts } from "./table/contracts";
import { dashboards } from "./table/dashboards";
import { roleDashboards } from "./table/roleDashboards";
import { calendarEvents } from "./table/calendarEvents";
import { calendarEventSeries } from "./table/calendarEventSeries";
import { calendarEventUsers } from "./table/calendarEventUsers";
import { documentReads } from "./table/documentReads";
import { documentUserPermissions } from "./table/documentUserPermissions";
import { documents } from "./table/documents";
import { eventRsvps } from "./table/eventRsvps";
import { feedback } from "./table/feedback";
import { folders } from "./table/folders";
import { injuryRehabNotes } from "./table/injuryRehabNotes";
import { invitations } from "./table/invitations";
import { notifications } from "./table/notifications";
import { playerFitness } from "./table/playerFitness";
import { playerInvites } from "./table/playerInvites";
import { playerInjuries } from "./table/playerInjuries";
import { playerStats } from "./table/playerStats";
import { players } from "./table/players";
import { staff } from "./table/staff";
import { teams } from "./table/teams";
import { userPinnedDashboards } from "./table/userPinnedDashboards";
import { userRecentDashboards } from "./table/userRecentDashboards";
import { users } from "./table/users";
import { wyscoutMatchMappings } from "./table/wyscoutMatchMappings";
import { wyscoutVideoCache } from "./table/wyscoutVideoCache";

export default defineSchema({
  ...authTables,
  adminInvites,
  calendarEvents,
  certifications,
  contracts,
  dashboards,
  calendarEventSeries,
  calendarEventUsers,
  documentReads,
  documentUserPermissions,
  documents,
  eventRsvps,
  feedback,
  folders,
  injuryRehabNotes,
  invitations,
  notifications,
  playerFitness,
  playerInjuries,
  playerInvites,
  playerStats,
  players,
  staff,
  roleDashboards,
  teams,
  userPinnedDashboards,
  userRecentDashboards,
  users,
  wyscoutMatchMappings,
  wyscoutVideoCache,
});
