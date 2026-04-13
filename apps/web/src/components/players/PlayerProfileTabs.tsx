"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  IconUser,
  IconChartBar,
  IconHeartbeat,
  IconFirstAidKit,
  IconFileText,
  IconLink,
  IconPencil,
} from "@tabler/icons-react";
import {
  PLAYER_STATUS_LABELS,
  type PlayerStatus,
} from "@packages/shared/players";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { StatsLog } from "./StatsLog";
import { FitnessLog } from "./FitnessLog";
import { InjuryLog } from "./InjuryLog";
import { ContactInfoEditDialog } from "./ContactInfoEditDialog";
import { ExternalProviders } from "./ExternalProviders";
import { ContractCard } from "./ContractCard";

interface TabAccess {
  showInjuries: boolean;
  showContract: boolean;
  isSelf: boolean;
}

interface PlayerData {
  firstName: string;
  lastName: string;
  dateOfBirth?: number;
  nationality?: string;
  position: string;
  squadNumber?: number;
  preferredFoot?: string;
  heightCm?: number;
  weightKg?: number;
  phone?: string;
  personalEmail?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  status: string;
}

interface PlayerProfileTabsProps {
  tabAccess: TabAccess;
  player: PlayerData;
  playerId: Id<"players">;
  isAdmin: boolean;
  canEditFitness?: boolean;
  /** Story 6.2 AC7: canViewContract from contracts module — single source of truth */
  canViewContract?: boolean;
}

function BioField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function PlaceholderTab({ icon: Icon, name }: { icon: React.ComponentType<{ className?: string }>; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="text-muted-foreground mb-3 size-10" />
      <h3 className="text-lg font-medium">{name}</h3>
      <p className="text-muted-foreground mt-1 text-sm">Coming in a future update</p>
    </div>
  );
}

export function PlayerProfileTabs({ tabAccess, player, playerId, isAdmin, canEditFitness = false, canViewContract }: PlayerProfileTabsProps) {
  // Story 5.6 AC #9: Self-service contact info edit dialog state
  const [contactEditOpen, setContactEditOpen] = React.useState(false);
  const handleOpenContactEdit = React.useCallback(() => setContactEditOpen(true), []);
  const handleCloseContactEdit = React.useCallback(() => setContactEditOpen(false), []);

  // Story 5.6 AC #9: Player self-service shows "Edit Contact Info"
  // Story 12.3 AC #5: Admin can edit any player's contact info
  const showSelfServiceEdit = tabAccess.isSelf && !isAdmin;
  const showAdminContactEdit = isAdmin;

  return (
    <Tabs defaultValue="bio">
      <TabsList variant="line">
        <TabsTrigger value="bio">
          <IconUser className="mr-1.5 size-4" />
          Bio
        </TabsTrigger>
        <TabsTrigger value="performance">
          <IconChartBar className="mr-1.5 size-4" />
          Performance
        </TabsTrigger>
        <TabsTrigger value="fitness">
          <IconHeartbeat className="mr-1.5 size-4" />
          Fitness
        </TabsTrigger>
        {/* [DEPLOY:I2] {tabAccess.showInjuries && (
          <TabsTrigger value="injuries">
            <IconFirstAidKit className="mr-1.5 size-4" />
            Injuries
          </TabsTrigger>
        )} */}
        {/* Story 6.2 AC7: canViewContract is single source of truth for tab visibility */}
        {canViewContract === true && (
          <TabsTrigger value="contract">
            <IconFileText className="mr-1.5 size-4" />
            Contract
          </TabsTrigger>
        )}
        <TabsTrigger value="integrations">
          <IconLink className="mr-1.5 size-4" />
          Integrations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bio">
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Personal Information
                </h3>
                {(showSelfServiceEdit || showAdminContactEdit) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenContactEdit}
                  >
                    <IconPencil className="mr-1.5 size-3.5" />
                    Edit Contact Info
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <BioField
                  label="Date of Birth"
                  value={
                    player.dateOfBirth
                      ? format(new Date(player.dateOfBirth), "dd/MM/yyyy")
                      : undefined
                  }
                />
                <BioField label="Nationality" value={player.nationality} />
                <BioField label="Position" value={player.position} />
                <BioField
                  label="Squad Number"
                  value={player.squadNumber != null ? `#${player.squadNumber}` : undefined}
                />
                <BioField label="Preferred Foot" value={player.preferredFoot} />
                <BioField
                  label="Height"
                  value={player.heightCm != null ? `${player.heightCm} cm` : undefined}
                />
                <BioField
                  label="Weight"
                  value={player.weightKg != null ? `${player.weightKg} kg` : undefined}
                />
                <BioField label="Status" value={PLAYER_STATUS_LABELS[player.status as PlayerStatus]} />
                <BioField label="Phone" value={player.phone} />
                <BioField label="Personal Email" value={player.personalEmail} />
                <BioField label="Address" value={player.address} />
              </dl>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Emergency Contact
              </h3>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <BioField label="Name" value={player.emergencyContactName} />
                <BioField label="Relationship" value={player.emergencyContactRelationship} />
                <BioField label="Phone" value={player.emergencyContactPhone} />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Story 5.6 AC #9, #11: Self-service contact info edit dialog */}
        {/* Story 12.3 AC #6: Admin mode with playerId prop */}
        {(showSelfServiceEdit || showAdminContactEdit) && (
          <ContactInfoEditDialog
            player={player}
            open={contactEditOpen}
            onClose={handleCloseContactEdit}
            isAdmin={showAdminContactEdit}
            playerId={showAdminContactEdit ? playerId : undefined}
          />
        )}
      </TabsContent>

      <TabsContent value="performance">
        <StatsLog playerId={playerId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="fitness">
        <FitnessLog playerId={playerId} canEdit={canEditFitness} />
      </TabsContent>

      {/* [DEPLOY:I3] {tabAccess.showInjuries && (
        <TabsContent value="injuries">
          <InjuryLog playerId={playerId} />
        </TabsContent>
      )} */}

      {/* Story 6.2 AC1,3,7: Contract tab completely omitted from DOM for unauthorized users */}
      {canViewContract === true && (
        <TabsContent value="contract">
          <ContractCard playerId={playerId} isAdmin={isAdmin} />
        </TabsContent>
      )}

      <TabsContent value="integrations">
        <ExternalProviders playerId={playerId} playerName={`${player.firstName} ${player.lastName}`} />
      </TabsContent>
    </Tabs>
  );
}
