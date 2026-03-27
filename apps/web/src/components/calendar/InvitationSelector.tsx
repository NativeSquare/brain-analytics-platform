"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { USER_ROLES, ROLE_LABELS } from "@packages/shared/roles";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, UserPlus } from "lucide-react";

import type { UserRole } from "@packages/shared/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectedUser {
  _id: string;
  fullName: string;
}

interface InvitationSelectorProps {
  selectedRoles: UserRole[];
  onRolesChange: (roles: UserRole[]) => void;
  selectedUsers: SelectedUser[];
  onUsersChange: (users: SelectedUser[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvitationSelector({
  selectedRoles,
  onRolesChange,
  selectedUsers,
  onUsersChange,
}: InvitationSelectorProps) {
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const teamUsers = useQuery(
    api.users.queries.searchTeamUsers,
    userSearchOpen
      ? debouncedSearch.trim().length > 0
        ? { search: debouncedSearch }
        : {}
      : "skip",
  );

  const handleRoleToggle = useCallback(
    (role: UserRole) => {
      if (selectedRoles.includes(role)) {
        onRolesChange(selectedRoles.filter((r) => r !== role));
      } else {
        onRolesChange([...selectedRoles, role]);
      }
    },
    [selectedRoles, onRolesChange],
  );

  const handleSelectUser = useCallback(
    (user: { _id: string; fullName: string }) => {
      if (!selectedUsers.some((u) => u._id === user._id)) {
        onUsersChange([...selectedUsers, { _id: user._id, fullName: user.fullName }]);
      }
      setUserSearchOpen(false);
      setSearchInput("");
    },
    [selectedUsers, onUsersChange],
  );

  const handleRemoveUser = useCallback(
    (userId: string) => {
      onUsersChange(selectedUsers.filter((u) => u._id !== userId));
    },
    [selectedUsers, onUsersChange],
  );

  return (
    <div className="space-y-4">
      {/* Roles section */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Invite by Role</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {USER_ROLES.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => handleRoleToggle(role)}
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </div>

      {/* Individual users section */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Invite Specific Users</p>

        {/* Selected user badges */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((user) => (
              <Badge key={user._id} variant="secondary" className="gap-1 pr-1">
                {user.fullName}
                <button
                  type="button"
                  onClick={() => handleRemoveUser(user._id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                  <span className="sr-only">Remove {user.fullName}</span>
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* User search combobox */}
        <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <UserPlus className="size-4" />
              Search users…
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name…"
                value={searchInput}
                onValueChange={setSearchInput}
              />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {(teamUsers ?? []).map((user) => {
                    const alreadySelected = selectedUsers.some(
                      (u) => u._id === user._id,
                    );
                    return (
                      <CommandItem
                        key={user._id}
                        value={user._id}
                        disabled={alreadySelected}
                        onSelect={() =>
                          handleSelectUser({
                            _id: user._id,
                            fullName: user.fullName,
                          })
                        }
                      >
                        <span className="flex-1 truncate">
                          {user.fullName}
                        </span>
                        {user.role && (
                          <span className="text-muted-foreground text-xs capitalize">
                            {user.role}
                          </span>
                        )}
                        {alreadySelected && (
                          <span className="text-muted-foreground text-xs">
                            Added
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
