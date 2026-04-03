/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as calendar_accessControl from "../calendar/accessControl.js";
import type * as calendar_ics from "../calendar/ics.js";
import type * as calendar_internalQueries from "../calendar/internalQueries.js";
import type * as calendar_mutations from "../calendar/mutations.js";
import type * as calendar_queries from "../calendar/queries.js";
import type * as calendar_utils from "../calendar/utils.js";
import type * as contracts_actions from "../contracts/actions.js";
import type * as contracts_internalMutations from "../contracts/internalMutations.js";
import type * as contracts_internalQueries from "../contracts/internalQueries.js";
import type * as contracts_mutations from "../contracts/mutations.js";
import type * as contracts_queries from "../contracts/queries.js";
import type * as crons from "../crons.js";
import type * as dashboards_mutations from "../dashboards/mutations.js";
import type * as dashboards_queries from "../dashboards/queries.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as invitations_actions from "../invitations/actions.js";
import type * as invitations_internalQueries from "../invitations/internalQueries.js";
import type * as invitations_mutations from "../invitations/mutations.js";
import type * as invitations_queries from "../invitations/queries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_auth_ResendOTP from "../lib/auth/ResendOTP.js";
import type * as lib_auth_ResendOTPPasswordReset from "../lib/auth/ResendOTPPasswordReset.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as migrations from "../migrations.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as players_mutations from "../players/mutations.js";
import type * as players_queries from "../players/queries.js";
import type * as search_queries from "../search/queries.js";
import type * as seed from "../seed.js";
import type * as storage from "../storage.js";
import type * as table_admin from "../table/admin.js";
import type * as table_adminInvites from "../table/adminInvites.js";
import type * as table_calendarEventSeries from "../table/calendarEventSeries.js";
import type * as table_calendarEventUsers from "../table/calendarEventUsers.js";
import type * as table_calendarEvents from "../table/calendarEvents.js";
import type * as table_contracts from "../table/contracts.js";
import type * as table_dashboards from "../table/dashboards.js";
import type * as table_documentReads from "../table/documentReads.js";
import type * as table_documentUserPermissions from "../table/documentUserPermissions.js";
import type * as table_documents from "../table/documents.js";
import type * as table_eventRsvps from "../table/eventRsvps.js";
import type * as table_feedback from "../table/feedback.js";
import type * as table_folders from "../table/folders.js";
import type * as table_invitations from "../table/invitations.js";
import type * as table_notifications from "../table/notifications.js";
import type * as table_playerFitness from "../table/playerFitness.js";
import type * as table_playerInjuries from "../table/playerInjuries.js";
import type * as table_playerInvites from "../table/playerInvites.js";
import type * as table_playerStats from "../table/playerStats.js";
import type * as table_players from "../table/players.js";
import type * as table_roleDashboards from "../table/roleDashboards.js";
import type * as table_teams from "../table/teams.js";
import type * as table_userPinnedDashboards from "../table/userPinnedDashboards.js";
import type * as table_userRecentDashboards from "../table/userRecentDashboards.js";
import type * as table_users from "../table/users.js";
import type * as table_wyscoutMatchMappings from "../table/wyscoutMatchMappings.js";
import type * as table_wyscoutVideoCache from "../table/wyscoutVideoCache.js";
import type * as testing from "../testing.js";
import type * as userDashboards from "../userDashboards.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as utils_generateFunctions from "../utils/generateFunctions.js";
import type * as wyscoutCache from "../wyscoutCache.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "calendar/accessControl": typeof calendar_accessControl;
  "calendar/ics": typeof calendar_ics;
  "calendar/internalQueries": typeof calendar_internalQueries;
  "calendar/mutations": typeof calendar_mutations;
  "calendar/queries": typeof calendar_queries;
  "calendar/utils": typeof calendar_utils;
  "contracts/actions": typeof contracts_actions;
  "contracts/internalMutations": typeof contracts_internalMutations;
  "contracts/internalQueries": typeof contracts_internalQueries;
  "contracts/mutations": typeof contracts_mutations;
  "contracts/queries": typeof contracts_queries;
  crons: typeof crons;
  "dashboards/mutations": typeof dashboards_mutations;
  "dashboards/queries": typeof dashboards_queries;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  emails: typeof emails;
  http: typeof http;
  "invitations/actions": typeof invitations_actions;
  "invitations/internalQueries": typeof invitations_internalQueries;
  "invitations/mutations": typeof invitations_mutations;
  "invitations/queries": typeof invitations_queries;
  "lib/auth": typeof lib_auth;
  "lib/auth/ResendOTP": typeof lib_auth_ResendOTP;
  "lib/auth/ResendOTPPasswordReset": typeof lib_auth_ResendOTPPasswordReset;
  "lib/notifications": typeof lib_notifications;
  "lib/permissions": typeof lib_permissions;
  migrations: typeof migrations;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  "players/mutations": typeof players_mutations;
  "players/queries": typeof players_queries;
  "search/queries": typeof search_queries;
  seed: typeof seed;
  storage: typeof storage;
  "table/admin": typeof table_admin;
  "table/adminInvites": typeof table_adminInvites;
  "table/calendarEventSeries": typeof table_calendarEventSeries;
  "table/calendarEventUsers": typeof table_calendarEventUsers;
  "table/calendarEvents": typeof table_calendarEvents;
  "table/contracts": typeof table_contracts;
  "table/dashboards": typeof table_dashboards;
  "table/documentReads": typeof table_documentReads;
  "table/documentUserPermissions": typeof table_documentUserPermissions;
  "table/documents": typeof table_documents;
  "table/eventRsvps": typeof table_eventRsvps;
  "table/feedback": typeof table_feedback;
  "table/folders": typeof table_folders;
  "table/invitations": typeof table_invitations;
  "table/notifications": typeof table_notifications;
  "table/playerFitness": typeof table_playerFitness;
  "table/playerInjuries": typeof table_playerInjuries;
  "table/playerInvites": typeof table_playerInvites;
  "table/playerStats": typeof table_playerStats;
  "table/players": typeof table_players;
  "table/roleDashboards": typeof table_roleDashboards;
  "table/teams": typeof table_teams;
  "table/userPinnedDashboards": typeof table_userPinnedDashboards;
  "table/userRecentDashboards": typeof table_userRecentDashboards;
  "table/users": typeof table_users;
  "table/wyscoutMatchMappings": typeof table_wyscoutMatchMappings;
  "table/wyscoutVideoCache": typeof table_wyscoutVideoCache;
  testing: typeof testing;
  userDashboards: typeof userDashboards;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "utils/generateFunctions": typeof utils_generateFunctions;
  wyscoutCache: typeof wyscoutCache;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
