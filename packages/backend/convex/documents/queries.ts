import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";
import {
  filterByAccess,
  filterDocumentsByAccess,
  checkDocumentAccess,
} from "../lib/permissions";

/**
 * Returns folders at a given level (top-level if no parentId, or children of parentId).
 * Admin sees all; non-admin sees only unrestricted or role-permitted folders.
 * Excludes soft-deleted folders. Sorted by name ascending.
 */
export const getFolders = query({
  args: { parentId: v.optional(v.id("folders")) },
  handler: async (ctx, { parentId }) => {
    const { user, teamId } = await requireAuth(ctx);

    let folders;
    if (parentId) {
      folders = await ctx.db
        .query("folders")
        .withIndex("by_teamId_parentId", (q) =>
          q.eq("teamId", teamId).eq("parentId", parentId),
        )
        .collect();
    } else {
      // Top-level: parentId is undefined
      folders = await ctx.db
        .query("folders")
        .withIndex("by_teamId_parentId", (q) =>
          q.eq("teamId", teamId).eq("parentId", undefined),
        )
        .collect();
    }

    // Filter out soft-deleted
    const nonDeleted = folders.filter((f) => f.isDeleted !== true);

    // Apply comprehensive access filtering (role + individual user permissions)
    const result = await filterByAccess(ctx, user, nonDeleted, teamId);

    // Sort alphabetically by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  },
});

/**
 * Returns folder info, subfolders, and documents for a given folder.
 * Validates team access. Applies role-based filtering for non-admin users.
 */
export const getFolderContents = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.teamId !== teamId) {
      return { folder: null, subfolders: [], documents: [] };
    }

    // Get subfolders
    let subfolders = await ctx.db
      .query("folders")
      .withIndex("by_teamId_parentId", (q) =>
        q.eq("teamId", teamId).eq("parentId", folderId),
      )
      .collect();

    // Filter out soft-deleted subfolders
    const nonDeletedSubs = subfolders.filter((f) => f.isDeleted !== true);

    // Apply comprehensive access filtering to subfolders
    const filteredSubfolders = await filterByAccess(ctx, user, nonDeletedSubs, teamId);

    // Sort subfolders by name
    filteredSubfolders.sort((a, b) => a.name.localeCompare(b.name));

    // Get documents in this folder
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_teamId_folderId", (q) =>
        q.eq("teamId", teamId).eq("folderId", folderId),
      )
      .collect();

    // Apply comprehensive access filtering to documents (with inheritance)
    const documents = await filterDocumentsByAccess(
      ctx,
      user,
      allDocuments,
      teamId,
      folder,
    );

    // Sort documents by createdAt descending
    documents.sort((a, b) => b.createdAt - a.createdAt);

    return {
      folder: { _id: folder._id, name: folder.name, parentId: folder.parentId },
      subfolders: filteredSubfolders,
      documents,
    };
  },
});

/**
 * Returns the breadcrumb path from root to the given folder.
 * Maximum 2 hops since depth is capped at 2.
 */
export const getFolderBreadcrumb = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const { teamId } = await requireAuth(ctx);

    // Fetch the target folder
    const folder = await ctx.db.get(folderId);
    if (!folder || folder.teamId !== teamId) {
      return [];
    }

    // If this folder has a parent, fetch it (max depth = 2)
    if (folder.parentId) {
      const parent = await ctx.db.get(folder.parentId);
      if (!parent || parent.teamId !== teamId) {
        return [];
      }
      return [
        { _id: parent._id as string, name: parent.name },
        { _id: folder._id as string, name: folder.name },
      ];
    }

    // Top-level folder: single element
    return [{ _id: folder._id as string, name: folder.name }];
  },
});

/**
 * Batch query for folder item counts (subfolders + documents per folder).
 * Avoids N+1 queries when rendering folder cards.
 */
export const getFolderItemCounts = query({
  args: { folderIds: v.array(v.id("folders")) },
  handler: async (ctx, { folderIds }) => {
    const { teamId } = await requireAuth(ctx);
    const counts: Record<string, { subfolders: number; documents: number }> = {};

    for (const folderId of folderIds) {
      const subfolders = await ctx.db
        .query("folders")
        .withIndex("by_teamId_parentId", (q) =>
          q.eq("teamId", teamId).eq("parentId", folderId),
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();

      const documents = await ctx.db
        .query("documents")
        .withIndex("by_teamId_folderId", (q) =>
          q.eq("teamId", teamId).eq("folderId", folderId),
        )
        .collect();

      counts[folderId] = {
        subfolders: subfolders.length,
        documents: documents.length,
      };
    }

    return counts;
  },
});

// ---------------------------------------------------------------------------
// Document queries (Story 4.2)
// ---------------------------------------------------------------------------

/**
 * Returns a signed URL for downloading a file-type document.
 * Returns null for video link documents (no storageId).
 */
export const getDocumentUrl = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Access check — deny if user lacks permission
    const hasAccess = await checkDocumentAccess(ctx, user, document);
    if (!hasAccess) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "You do not have permission to access this document.",
      });
    }

    if (!document.storageId) {
      return null;
    }

    const url = await ctx.storage.getUrl(document.storageId as Id<"_storage">);
    return url;
  },
});

/**
 * Returns full document details including owner name.
 */
export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { user, teamId } = await requireAuth(ctx);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Access check — deny if user lacks permission
    const hasAccess = await checkDocumentAccess(ctx, user, document);
    if (!hasAccess) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED" as const,
        message: "You do not have permission to access this document.",
      });
    }

    // Fetch owner user record
    const owner = await ctx.db.get(document.ownerId);
    const ownerName = owner?.name ?? owner?.email ?? "Unknown";

    return {
      _id: document._id,
      teamId: document.teamId,
      folderId: document.folderId,
      name: document.name,
      filename: document.filename,
      extension: document.extension,
      storageId: document.storageId,
      videoUrl: document.videoUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      ownerId: document.ownerId,
      ownerName,
      permittedRoles: document.permittedRoles,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  },
});

// ---------------------------------------------------------------------------
// Permission queries (Story 4.3)
// ---------------------------------------------------------------------------

/**
 * Returns the current permissions for a folder or document. Admin-only.
 */
export const getPermissions = query({
  args: {
    targetType: v.union(v.literal("folder"), v.literal("document")),
    targetId: v.string(),
  },
  handler: async (ctx, { targetType, targetId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    // Fetch the target
    let permittedRoles: string[] | undefined;

    if (targetType === "folder") {
      const folder = await ctx.db.get(targetId as Id<"folders">);
      if (!folder || folder.teamId !== teamId) {
        throw new ConvexError({
          code: "NOT_FOUND" as const,
          message: "Folder not found.",
        });
      }
      permittedRoles = folder.permittedRoles;
    } else {
      const document = await ctx.db.get(targetId as Id<"documents">);
      if (!document || document.teamId !== teamId) {
        throw new ConvexError({
          code: "NOT_FOUND" as const,
          message: "Document not found.",
        });
      }
      permittedRoles = document.permittedRoles;
    }

    // Fetch user permissions for this target
    const userPerms = await ctx.db
      .query("documentUserPermissions")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .collect();

    // Filter to only matching targetType
    const matchingPerms = userPerms.filter((p) => p.targetType === targetType);

    // Join with user table
    const users: Array<{
      userId: Id<"users">;
      fullName: string;
      email: string;
      role: string;
    }> = [];

    for (const perm of matchingPerms) {
      const u = await ctx.db.get(perm.userId);
      if (u) {
        users.push({
          userId: u._id,
          fullName: u.fullName ?? u.name ?? u.email ?? "Unknown",
          email: u.email ?? "",
          role: u.role ?? "",
        });
      }
    }

    return { permittedRoles, users };
  },
});

// ---------------------------------------------------------------------------
// Read tracking queries (Story 4.4)
// ---------------------------------------------------------------------------

/**
 * Shared helper: returns all active users who have access to a document.
 * Evaluates document-level or inherited folder-level permissions.
 */
async function _getUsersWithAccess(
  ctx: QueryCtx,
  document: Doc<"documents">,
  teamId: Id<"teams">,
): Promise<Doc<"users">[]> {
  // Determine effective permittedRoles
  let permittedRoles: string[] | undefined;

  if (document.permittedRoles !== undefined) {
    // Document has its own override
    permittedRoles = document.permittedRoles;
  } else {
    // Inherit from parent folder
    const folder = await ctx.db.get(document.folderId);
    permittedRoles = folder?.permittedRoles ?? undefined;
  }

  // Fetch all active team members
  const allUsers = await ctx.db
    .query("users")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .collect();

  const activeUsers = allUsers.filter((u) => u.status === "active");

  // If unrestricted, all active users have access
  if (permittedRoles === undefined || permittedRoles === null) {
    return activeUsers;
  }

  // Restricted: users whose role is in permittedRoles + individual grants + admins
  const roleSet = new Set(permittedRoles);

  // Get individual user permissions for this target
  const targetId =
    document.permittedRoles !== undefined
      ? (document._id as string)
      : (document.folderId as string);

  const individualPerms = await ctx.db
    .query("documentUserPermissions")
    .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
    .collect();

  const individualUserIds = new Set(individualPerms.map((p) => p.userId as string));

  const usersWithAccess = activeUsers.filter((u) => {
    // Admins always have access
    if (u.role === "admin") return true;
    // Role-based access
    if (u.role && roleSet.has(u.role)) return true;
    // Individual grant
    if (individualUserIds.has(u._id as string)) return true;
    return false;
  });

  return usersWithAccess;
}

/**
 * Returns aggregate read data for a batch of documents. Admin-only.
 * Batched to avoid N+1 queries. Also includes `totalWithAccess` per document
 * (inlined to avoid separate per-document queries).
 */
export const getReadStats = query({
  args: { documentIds: v.array(v.id("documents")) },
  handler: async (ctx, { documentIds }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const result: Record<
      string,
      {
        uniqueReaders: number;
        totalWithAccess: number;
        reads: Array<{ userId: Id<"users">; fullName: string; readAt: number }>;
      }
    > = {};

    for (const documentId of documentIds) {
      const document = await ctx.db.get(documentId);
      if (!document || document.teamId !== teamId) {
        result[documentId] = { uniqueReaders: 0, totalWithAccess: 0, reads: [] };
        continue;
      }

      const reads = await ctx.db
        .query("documentReads")
        .withIndex("by_documentId", (q) => q.eq("documentId", documentId))
        .collect();

      // Filter by teamId for multi-tenant isolation
      const teamReads = reads.filter((r) => r.teamId === teamId);

      // Join with users table
      const readEntries: Array<{
        userId: Id<"users">;
        fullName: string;
        readAt: number;
      }> = [];

      for (const read of teamReads) {
        const user = await ctx.db.get(read.userId);
        readEntries.push({
          userId: read.userId,
          fullName: user?.fullName ?? user?.name ?? user?.email ?? "Unknown",
          readAt: read.readAt,
        });
      }

      // Sort by readAt descending (most recent first)
      readEntries.sort((a, b) => b.readAt - a.readAt);

      // Compute access count inline
      const usersWithAccess = await _getUsersWithAccess(ctx, document, teamId);

      result[documentId] = {
        uniqueReaders: readEntries.length,
        totalWithAccess: usersWithAccess.length,
        reads: readEntries,
      };
    }

    return result;
  },
});

/**
 * Returns total number of users with access to a document. Admin-only.
 * Evaluates permissions (document-level or inherited folder-level).
 */
export const getUsersWithAccessCount = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    const usersWithAccess = await _getUsersWithAccess(ctx, document, teamId);

    return { totalWithAccess: usersWithAccess.length };
  },
});

/**
 * Returns detailed reader list for a document, split into readers and non-readers.
 * Admin-only.
 */
export const getReadersDetail = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Get all read records for this document
    const allReads = await ctx.db
      .query("documentReads")
      .withIndex("by_documentId", (q) => q.eq("documentId", documentId))
      .collect();

    // Filter by teamId
    const teamReads = allReads.filter((r) => r.teamId === teamId);

    // Build a map of userId -> readAt
    const readMap = new Map<string, number>();
    for (const read of teamReads) {
      readMap.set(read.userId as string, read.readAt);
    }

    // Get all users with access
    const usersWithAccess = await _getUsersWithAccess(ctx, document, teamId);

    // Split into readers and non-readers
    const readers: Array<{
      userId: Id<"users">;
      fullName: string;
      role: string;
      readAt: number;
    }> = [];

    const nonReaders: Array<{
      userId: Id<"users">;
      fullName: string;
      role: string;
    }> = [];

    for (const user of usersWithAccess) {
      const readAt = readMap.get(user._id as string);
      const fullName = user.fullName ?? user.name ?? user.email ?? "Unknown";
      const role = user.role ?? "";

      if (readAt !== undefined) {
        readers.push({ userId: user._id, fullName, role, readAt });
      } else {
        nonReaders.push({ userId: user._id, fullName, role });
      }
    }

    // Sort readers by readAt descending, nonReaders alphabetically
    readers.sort((a, b) => b.readAt - a.readAt);
    nonReaders.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return { readers, nonReaders, documentName: document.name };
  },
});
