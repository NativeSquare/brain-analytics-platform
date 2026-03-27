import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";

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
