import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireRole } from "../lib/auth";
import { VALID_PERMISSION_ROLES } from "../lib/permissions";

/**
 * Creates a new folder. Admin-only.
 * Enforces two-level maximum depth.
 */
export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, { name, parentId }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Folder name cannot be empty.",
      });
    }

    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.teamId !== teamId) {
        throw new ConvexError({
          code: "NOT_FOUND" as const,
          message: "Parent folder not found.",
        });
      }
      // Check depth: if parent has a parentId, it's already level 2 -> reject level 3
      if (parent.parentId !== undefined) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: "Maximum folder depth of two levels exceeded.",
        });
      }
    }

    const folderId = await ctx.db.insert("folders", {
      teamId,
      name: trimmedName,
      parentId,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return folderId;
  },
});

/**
 * Renames an existing folder. Admin-only.
 */
export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, { folderId, name }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Folder not found.",
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Folder name cannot be empty.",
      });
    }

    await ctx.db.patch(folderId, { name: trimmedName });

    return { success: true };
  },
});

/**
 * Deletes an empty folder. Admin-only.
 * Rejects if folder has subfolders or documents.
 */
export const deleteFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, { folderId }) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Folder not found.",
      });
    }

    // Check for subfolders
    const subfolders = await ctx.db
      .query("folders")
      .withIndex("by_teamId_parentId", (q) =>
        q.eq("teamId", teamId).eq("parentId", folderId),
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    if (subfolders.length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message:
          "Cannot delete folder that contains subfolders. Remove subfolders first.",
      });
    }

    // Check for documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_teamId_folderId", (q) =>
        q.eq("teamId", teamId).eq("folderId", folderId),
      )
      .collect();

    if (documents.length > 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message:
          "Cannot delete folder that contains documents. Remove documents first.",
      });
    }

    await ctx.db.delete(folderId);

    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Document mutations (Story 4.2)
// ---------------------------------------------------------------------------

/**
 * Uploads a document record after file is stored via Convex storage. Admin-only.
 */
export const uploadDocument = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
    filename: v.string(),
    extension: v.string(),
    storageId: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Validate folder exists and belongs to team
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Folder not found.",
      });
    }

    const documentId = await ctx.db.insert("documents", {
      teamId,
      folderId: args.folderId,
      name: args.name,
      filename: args.filename,
      extension: args.extension,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      videoUrl: undefined,
      ownerId: user._id,
      permittedRoles: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

/**
 * Adds a video link document. Admin-only.
 */
export const addVideoLink = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Validate folder exists and belongs to team
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Folder not found.",
      });
    }

    // Validate URL prefix
    if (
      !args.videoUrl.startsWith("http://") &&
      !args.videoUrl.startsWith("https://")
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Video URL must start with http:// or https://.",
      });
    }

    const documentId = await ctx.db.insert("documents", {
      teamId,
      folderId: args.folderId,
      name: args.name,
      filename: undefined,
      extension: undefined,
      storageId: undefined,
      mimeType: undefined,
      fileSize: undefined,
      videoUrl: args.videoUrl,
      ownerId: user._id,
      permittedRoles: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

/**
 * Replaces the file on an existing file-type document. Admin-only.
 * Deletes the old file from Convex storage.
 */
export const replaceFile = mutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.string(),
    filename: v.string(),
    extension: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const document = await ctx.db.get(args.documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Must be a file document, not a video link
    if (!document.storageId && document.videoUrl) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: "Cannot replace file on a video link document.",
      });
    }

    // Delete old file from storage
    if (document.storageId) {
      await ctx.storage.delete(document.storageId as Id<"_storage">);
    }

    await ctx.db.patch(args.documentId, {
      storageId: args.storageId,
      filename: args.filename,
      extension: args.extension,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Deletes a document and its file from storage. Admin-only.
 * Also cascades to delete related documentReads records.
 */
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const { teamId } = await requireRole(ctx, ["admin"]);

    const document = await ctx.db.get(args.documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Delete file from storage if it exists
    if (document.storageId) {
      await ctx.storage.delete(document.storageId as Id<"_storage">);
    }

    // Cascade delete related documentReads
    const reads = await ctx.db
      .query("documentReads")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const read of reads) {
      await ctx.db.delete(read._id);
    }

    // Delete the document record
    await ctx.db.delete(args.documentId);

    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Permission mutations (Story 4.3)
// ---------------------------------------------------------------------------

/**
 * Set role and individual-user permissions on a folder. Admin-only.
 * Replaces any existing `documentUserPermissions` records for this folder.
 */
export const setFolderPermissions = mutation({
  args: {
    folderId: v.id("folders"),
    permittedRoles: v.optional(v.array(v.string())),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, { folderId, permittedRoles, userIds }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Validate folder exists & belongs to team
    const folder = await ctx.db.get(folderId);
    if (!folder || folder.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Folder not found.",
      });
    }

    // Validate role values (skip when undefined = unrestricted)
    if (permittedRoles !== undefined) {
      for (const role of permittedRoles) {
        if (!(VALID_PERMISSION_ROLES as readonly string[]).includes(role)) {
          throw new ConvexError({
            code: "VALIDATION_ERROR" as const,
            message: `Invalid role: "${role}". Must be one of: ${VALID_PERMISSION_ROLES.join(", ")}.`,
          });
        }
      }
    }

    // Validate userIds — each must exist and belong to the same team
    for (const uid of userIds) {
      const targetUser = await ctx.db.get(uid);
      if (!targetUser || targetUser.teamId !== teamId) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `User ${uid} not found or belongs to a different team.`,
        });
      }
    }

    // Patch folder permittedRoles (undefined removes the field = unrestricted)
    await ctx.db.patch(folderId, { permittedRoles });

    // Sync documentUserPermissions — delete existing, insert new
    const existingPerms = await ctx.db
      .query("documentUserPermissions")
      .withIndex("by_targetId", (q) => q.eq("targetId", folderId as string))
      .collect();

    for (const perm of existingPerms) {
      if (perm.targetType === "folder") {
        await ctx.db.delete(perm._id);
      }
    }

    for (const uid of userIds) {
      await ctx.db.insert("documentUserPermissions", {
        teamId,
        targetType: "folder",
        targetId: folderId as string,
        userId: uid,
        grantedBy: user._id,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Set role and individual-user permissions on a document. Admin-only.
 * When `permittedRoles` is `undefined`, the document inherits from its folder.
 */
export const setDocumentPermissions = mutation({
  args: {
    documentId: v.id("documents"),
    permittedRoles: v.optional(v.array(v.string())),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, { documentId, permittedRoles, userIds }) => {
    const { user, teamId } = await requireRole(ctx, ["admin"]);

    // Validate document exists & belongs to team
    const document = await ctx.db.get(documentId);
    if (!document || document.teamId !== teamId) {
      throw new ConvexError({
        code: "NOT_FOUND" as const,
        message: "Document not found.",
      });
    }

    // Validate role values if provided
    if (permittedRoles !== undefined) {
      for (const role of permittedRoles) {
        if (!(VALID_PERMISSION_ROLES as readonly string[]).includes(role)) {
          throw new ConvexError({
            code: "VALIDATION_ERROR" as const,
            message: `Invalid role: "${role}". Must be one of: ${VALID_PERMISSION_ROLES.join(", ")}.`,
          });
        }
      }
    }

    // Validate userIds
    for (const uid of userIds) {
      const targetUser = await ctx.db.get(uid);
      if (!targetUser || targetUser.teamId !== teamId) {
        throw new ConvexError({
          code: "VALIDATION_ERROR" as const,
          message: `User ${uid} not found or belongs to a different team.`,
        });
      }
    }

    // Patch document permittedRoles
    await ctx.db.patch(documentId, { permittedRoles });

    // Sync documentUserPermissions — delete existing, insert new
    const existingPerms = await ctx.db
      .query("documentUserPermissions")
      .withIndex("by_targetId", (q) =>
        q.eq("targetId", documentId as string),
      )
      .collect();

    for (const perm of existingPerms) {
      if (perm.targetType === "document") {
        await ctx.db.delete(perm._id);
      }
    }

    // When inheriting (permittedRoles === undefined), clear user permissions too
    if (permittedRoles === undefined) {
      return { success: true };
    }

    for (const uid of userIds) {
      await ctx.db.insert("documentUserPermissions", {
        teamId,
        targetType: "document",
        targetId: documentId as string,
        userId: uid,
        grantedBy: user._id,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
