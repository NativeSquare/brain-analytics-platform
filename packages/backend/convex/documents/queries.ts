import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";

/**
 * Returns folders at a given level (top-level if no parentId, or children of parentId).
 * Admin sees all; non-admin sees only unrestricted or role-permitted folders.
 * Excludes soft-deleted folders. Sorted by name ascending.
 */
export const getFolders = query({
  args: { parentId: v.optional(v.id("folders")) },
  handler: async (ctx, { parentId }) => {
    const { user, teamId } = await requireAuth(ctx);
    const isAdmin = user.role === "admin";

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
    let result = folders.filter((f) => f.isDeleted !== true);

    // Non-admin: filter by permittedRoles
    if (!isAdmin) {
      result = result.filter((f) => {
        // null/undefined/empty = unrestricted
        if (!f.permittedRoles || f.permittedRoles.length === 0) return true;
        return user.role ? f.permittedRoles.includes(user.role) : false;
      });
    }

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
    const isAdmin = user.role === "admin";

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
    subfolders = subfolders.filter((f) => f.isDeleted !== true);

    // Non-admin: filter subfolders by permittedRoles
    if (!isAdmin) {
      subfolders = subfolders.filter((f) => {
        if (!f.permittedRoles || f.permittedRoles.length === 0) return true;
        return user.role ? f.permittedRoles.includes(user.role) : false;
      });
    }

    // Sort subfolders by name
    subfolders.sort((a, b) => a.name.localeCompare(b.name));

    // Get documents in this folder
    let documents = await ctx.db
      .query("documents")
      .withIndex("by_teamId_folderId", (q) =>
        q.eq("teamId", teamId).eq("folderId", folderId),
      )
      .collect();

    // Non-admin: filter documents by permittedRoles (null inherits folder permissions)
    if (!isAdmin) {
      documents = documents.filter((doc) => {
        if (!doc.permittedRoles || doc.permittedRoles.length === 0) return true;
        return user.role ? doc.permittedRoles.includes(user.role) : false;
      });
    }

    // Sort documents by createdAt descending
    documents.sort((a, b) => b.createdAt - a.createdAt);

    return {
      folder: { _id: folder._id, name: folder.name, parentId: folder.parentId },
      subfolders,
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
    const { teamId } = await requireAuth(ctx);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
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
    const { teamId } = await requireAuth(ctx);

    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
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
