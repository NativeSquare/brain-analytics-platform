import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal user shape required by permission utilities. */
export type PermissionUser = Pick<Doc<"users">, "_id" | "role">;

interface CheckAccessArgs {
  permittedRoles: string[] | undefined | null;
  targetId: string;
  targetType: "folder" | "document";
  teamId: Id<"teams">;
}

// ---------------------------------------------------------------------------
// checkAccess — single-item access check
// ---------------------------------------------------------------------------

/**
 * Determine whether `user` can access a resource described by `args`.
 *
 * Order of checks:
 * 1. Admin → always `true`.
 * 2. Unrestricted (`permittedRoles` is `undefined` or `null`) → `true`.
 * 3. Role in `permittedRoles` array → `true`.
 * 4. Individual grant in `documentUserPermissions` → `true`.
 * 5. Otherwise → `false`.
 */
export async function checkAccess(
  ctx: QueryCtx,
  user: PermissionUser,
  args: CheckAccessArgs,
): Promise<boolean> {
  // 1. Admin always has access
  if (user.role === "admin") return true;

  // 2. Unrestricted
  if (args.permittedRoles === undefined || args.permittedRoles === null) {
    return true;
  }

  // 3. Role-based
  if (user.role && args.permittedRoles.includes(user.role)) {
    return true;
  }

  // 4. Individual user permission
  const perms = await ctx.db
    .query("documentUserPermissions")
    .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
    .collect();

  return perms.some((p) => p.userId === user._id);
}

// ---------------------------------------------------------------------------
// checkDocumentAccess — handles folder inheritance for documents
// ---------------------------------------------------------------------------

/**
 * Check access for a document, handling inheritance from its parent folder.
 *
 * - Owner always has access to their own documents.
 * - If the document has its own `permittedRoles` (override), check document-level.
 * - If `permittedRoles` is `undefined` (inherit), fall back to the parent folder's
 *   `permittedRoles` and the folder-level `documentUserPermissions`.
 */
export async function checkDocumentAccess(
  ctx: QueryCtx,
  user: PermissionUser,
  document: Doc<"documents">,
): Promise<boolean> {
  // Admin always has access
  if (user.role === "admin") return true;

  // Owner always has access to their own documents
  if (document.ownerId === user._id) return true;

  // Document has its own permissions (override)
  if (document.permittedRoles !== undefined) {
    return checkAccess(ctx, user, {
      permittedRoles: document.permittedRoles,
      targetId: document._id as string,
      targetType: "document",
      teamId: document.teamId,
    });
  }

  // Inherit from parent folder
  const folder = await ctx.db.get(document.folderId);
  if (!folder) return false;

  return checkAccess(ctx, user, {
    permittedRoles: folder.permittedRoles,
    targetId: folder._id as string,
    targetType: "folder",
    teamId: folder.teamId,
  });
}

// ---------------------------------------------------------------------------
// filterByAccess — batch-optimised filtering
// ---------------------------------------------------------------------------

type ItemWithPermissions = {
  _id: Id<"folders"> | Id<"documents">;
  permittedRoles?: string[];
};

/**
 * Filter an array of folders/documents, returning only those the user can
 * access. Uses a single batch query for `documentUserPermissions` instead of
 * per-item lookups → O(1) DB queries instead of O(N).
 *
 * NOTE: This does NOT handle document-level inheritance. For documents that
 * inherit (permittedRoles === undefined), use `filterDocumentsByAccess`.
 */
export async function filterByAccess<T extends ItemWithPermissions>(
  ctx: QueryCtx,
  user: PermissionUser,
  items: T[],
  teamId: Id<"teams">,
): Promise<T[]> {
  // Admin sees everything
  if (user.role === "admin") return items;

  // Phase 1: fast in-memory role check
  const roleGranted: T[] = [];
  const needsUserCheck: T[] = [];

  for (const item of items) {
    if (
      item.permittedRoles === undefined ||
      item.permittedRoles === null
    ) {
      // Unrestricted
      roleGranted.push(item);
    } else if (item.permittedRoles.length === 0) {
      // Empty array → no role-based access; must have individual grant
      needsUserCheck.push(item);
    } else if (user.role && item.permittedRoles.includes(user.role)) {
      roleGranted.push(item);
    } else {
      needsUserCheck.push(item);
    }
  }

  if (needsUserCheck.length === 0) return roleGranted;

  // Phase 2: single batch query for all user permissions in this team
  const userPerms = await ctx.db
    .query("documentUserPermissions")
    .withIndex("by_userId_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", teamId),
    )
    .collect();

  const permittedTargetIds = new Set(userPerms.map((p) => p.targetId));

  const userGranted = needsUserCheck.filter((item) =>
    permittedTargetIds.has(item._id as string),
  );

  return [...roleGranted, ...userGranted];
}

// ---------------------------------------------------------------------------
// filterDocumentsByAccess — batch filtering with folder inheritance
// ---------------------------------------------------------------------------

/**
 * Filter documents with inheritance support. Documents with
 * `permittedRoles === undefined` inherit from their parent folder.
 */
export async function filterDocumentsByAccess(
  ctx: QueryCtx,
  user: PermissionUser,
  documents: Doc<"documents">[],
  teamId: Id<"teams">,
  parentFolder?: Doc<"folders"> | null,
): Promise<Doc<"documents">[]> {
  // Admin sees everything
  if (user.role === "admin") return documents;

  // Batch-load user permissions once
  const userPerms = await ctx.db
    .query("documentUserPermissions")
    .withIndex("by_userId_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", teamId),
    )
    .collect();

  const permittedTargetIds = new Set(userPerms.map((p) => p.targetId));

  const result: Doc<"documents">[] = [];

  for (const doc of documents) {
    // Owner always has access to their own documents
    if (doc.ownerId === user._id) {
      result.push(doc);
      continue;
    }

    // Document has its own permissions (override)
    if (doc.permittedRoles !== undefined) {
      if (doc.permittedRoles.length === 0) {
        // No role-based access; check individual grant
        if (permittedTargetIds.has(doc._id as string)) {
          result.push(doc);
        }
        continue;
      }
      if (user.role && doc.permittedRoles.includes(user.role)) {
        result.push(doc);
        continue;
      }
      // Check individual grant on document
      if (permittedTargetIds.has(doc._id as string)) {
        result.push(doc);
      }
      continue;
    }

    // Inherit from parent folder
    const folder = parentFolder ?? (await ctx.db.get(doc.folderId));
    if (!folder) continue;

    const folderRoles = folder.permittedRoles;
    if (folderRoles === undefined || folderRoles === null) {
      // Folder unrestricted → document accessible
      result.push(doc);
      continue;
    }
    if (folderRoles.length === 0) {
      // No role access; check folder-level individual grant
      if (permittedTargetIds.has(folder._id as string)) {
        result.push(doc);
      }
      continue;
    }
    if (user.role && folderRoles.includes(user.role)) {
      result.push(doc);
      continue;
    }
    // Check folder-level individual grant
    if (permittedTargetIds.has(folder._id as string)) {
      result.push(doc);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// VALID_ROLES constant for mutation validation
// ---------------------------------------------------------------------------

export const VALID_PERMISSION_ROLES = [
  "admin",
  "coach",
  "analyst",
  "physio",
  "player",
  "staff",
] as const;
