"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { Lock, Search, X, ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "@packages/shared/roles";
import type { UserRole } from "@packages/shared/roles";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PermissionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "folder" | "document";
  targetId: string;
  targetName: string;
  folderId?: string; // for documents — inheritance context
}

const ALL_ROLES: UserRole[] = ["admin", "coach", "analyst", "physio", "player", "staff"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionsPanel({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  folderId,
}: PermissionsPanelProps) {
  // Query current permissions
  const permissions = useQuery(
    api.documents.queries.getPermissions,
    open ? { targetType, targetId } : "skip",
  );

  // Local state
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = React.useState<
    Array<{ userId: Id<"users">; fullName: string; email: string; role: string }>
  >([]);
  const [inheritFromFolder, setInheritFromFolder] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Mutations
  const setFolderPermissions = useMutation(api.documents.mutations.setFolderPermissions);
  const setDocumentPermissions = useMutation(api.documents.mutations.setDocumentPermissions);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Search team members (uses searchTeamUsers which is accessible to all authenticated users)
  const searchResults = useQuery(
    api.users.queries.searchTeamUsers,
    debouncedSearch.length >= 2 ? { search: debouncedSearch } : "skip",
  );

  // Initialize state from loaded permissions
  React.useEffect(() => {
    if (!permissions || initialized) return;

    if (permissions.permittedRoles === undefined) {
      // Unrestricted or inheriting
      if (targetType === "document") {
        setInheritFromFolder(true);
      }
      setSelectedRoles(new Set(ALL_ROLES));
    } else {
      if (targetType === "document") {
        setInheritFromFolder(false);
      }
      setSelectedRoles(new Set(permissions.permittedRoles));
    }

    setSelectedUsers(permissions.users);
    setInitialized(true);
  }, [permissions, initialized, targetType]);

  // Reset when panel closes
  React.useEffect(() => {
    if (!open) {
      setInitialized(false);
      setSearchInput("");
      setDebouncedSearch("");
      setIsSaving(false);
    }
  }, [open]);

  // Handlers
  const handleRoleToggle = (role: string, checked: boolean) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(role);
      } else {
        next.delete(role);
      }
      return next;
    });
  };

  const handleAddUser = (user: {
    _id: Id<"users">;
    fullName: string;
    email?: string;
    role?: string;
  }) => {
    if (selectedUsers.some((u) => u.userId === user._id)) return;
    setSelectedUsers((prev) => [
      ...prev,
      { userId: user._id, fullName: user.fullName, email: user.email ?? "", role: user.role ?? "" },
    ]);
    setSearchInput("");
  };

  const handleRemoveUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const handleMakeUnrestricted = () => {
    setSelectedRoles(new Set(ALL_ROLES));
    setSelectedUsers([]);
  };

  const handleInheritToggle = (checked: boolean) => {
    setInheritFromFolder(checked);
    if (checked) {
      // Reset to unrestricted state for display
      setSelectedRoles(new Set(ALL_ROLES));
      setSelectedUsers([]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (targetType === "folder") {
        const isUnrestricted = selectedRoles.size === ALL_ROLES.length;

        if (isUnrestricted) {
          // All roles selected → unrestricted: pass undefined to clear permittedRoles
          // Per AC #1: undefined/null means unrestricted — all roles have access
          await setFolderPermissions({
            folderId: targetId as Id<"folders">,
            permittedRoles: undefined,
            userIds: selectedUsers.map((u) => u.userId),
          });
        } else {
          // Restricted: always include admin in the permitted roles
          const roles = new Set(selectedRoles);
          roles.add("admin");
          await setFolderPermissions({
            folderId: targetId as Id<"folders">,
            permittedRoles: Array.from(roles),
            userIds: selectedUsers.map((u) => u.userId),
          });
        }
      } else {
        // Document
        if (inheritFromFolder) {
          // Inherit from folder → permittedRoles = undefined, no user IDs
          await setDocumentPermissions({
            documentId: targetId as Id<"documents">,
            permittedRoles: undefined,
            userIds: [],
          });
        } else {
          const isUnrestricted = selectedRoles.size === ALL_ROLES.length;
          let permittedRoles: string[];
          if (isUnrestricted) {
            // For documents, all roles = override with all roles (not inheritance)
            permittedRoles = [...ALL_ROLES];
          } else {
            const roles = new Set(selectedRoles);
            roles.add("admin");
            permittedRoles = Array.from(roles);
          }

          await setDocumentPermissions({
            documentId: targetId as Id<"documents">,
            permittedRoles,
            userIds: selectedUsers.map((u) => u.userId),
          });
        }
      }

      toast.success("Permissions updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter search results to exclude already-selected users
  const filteredSearchResults = searchResults?.filter(
    (u) => !selectedUsers.some((su) => su.userId === u._id),
  );

  const isEditable = targetType === "folder" || !inheritFromFolder;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lock className="size-4" />
            Permissions
          </SheetTitle>
          <p className="text-sm text-muted-foreground truncate">
            {targetType === "folder" ? "Folder" : "Document"}: {targetName}
          </p>
        </SheetHeader>

        {!permissions ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {/* Inheritance toggle (documents only) */}
            {targetType === "document" && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="inherit-toggle" className="text-sm font-medium">
                  Inherit from folder
                </Label>
                <Switch
                  id="inherit-toggle"
                  checked={inheritFromFolder}
                  onCheckedChange={handleInheritToggle}
                />
              </div>
            )}

            {/* Role checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Roles</h4>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleMakeUnrestricted}
                    className="text-xs text-primary hover:underline"
                  >
                    Make unrestricted (all roles)
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {ALL_ROLES.map((role) => {
                  const isAdmin = role === "admin";
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isAdmin ? true : selectedRoles.has(role)}
                        disabled={isAdmin || !isEditable}
                        onCheckedChange={(checked) =>
                          handleRoleToggle(role, checked === true)
                        }
                      />
                      <span className="text-sm">
                        {ROLE_LABELS[role]}
                      </span>
                      {isAdmin && (
                        <span className="text-xs text-muted-foreground">(always has access)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* User search */}
            {isEditable && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Individual Users</h4>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Search results dropdown */}
                {filteredSearchResults && filteredSearchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-popover">
                    {filteredSearchResults.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => handleAddUser(u)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                      >
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(u.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{u.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {ROLE_LABELS[u.role as UserRole] ?? u.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected users list */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-1">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.userId}
                        className="flex items-center gap-2 rounded-md border px-3 py-2"
                      >
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(u.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{u.fullName}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {ROLE_LABELS[u.role as UserRole] ?? u.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          onClick={() => handleRemoveUser(u.userId)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              <ShieldCheck className="mr-2 size-4" />
              {isSaving ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
