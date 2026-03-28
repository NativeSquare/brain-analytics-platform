"use client";

import { format } from "date-fns";
import {
  IconUser,
  IconChartBar,
  IconHeartbeat,
  IconFirstAidKit,
  IconFileText,
  IconLink,
} from "@tabler/icons-react";
import {
  PLAYER_STATUS_LABELS,
  type PlayerStatus,
} from "@packages/shared/players";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { StatsLog } from "./StatsLog";
import { FitnessLog } from "./FitnessLog";

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
}

function BioField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
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

export function PlayerProfileTabs({ tabAccess, player, playerId, isAdmin, canEditFitness = false }: PlayerProfileTabsProps) {
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
        {tabAccess.showInjuries && (
          <TabsTrigger value="injuries">
            <IconFirstAidKit className="mr-1.5 size-4" />
            Injuries
          </TabsTrigger>
        )}
        {tabAccess.showContract && (
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
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <BioField
                label="Date of Birth"
                value={
                  player.dateOfBirth
                    ? format(new Date(player.dateOfBirth), "dd MMM yyyy")
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

              {/* Emergency Contact section */}
              <div className="col-span-full mt-2 border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <BioField label="Name" value={player.emergencyContactName} />
                  <BioField label="Relationship" value={player.emergencyContactRelationship} />
                  <BioField label="Phone" value={player.emergencyContactPhone} />
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="performance">
        <StatsLog playerId={playerId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="fitness">
        <FitnessLog playerId={playerId} canEdit={canEditFitness} />
      </TabsContent>

      {tabAccess.showInjuries && (
        <TabsContent value="injuries">
          <PlaceholderTab icon={IconFirstAidKit} name="Injuries" />
        </TabsContent>
      )}

      {tabAccess.showContract && (
        <TabsContent value="contract">
          <PlaceholderTab icon={IconFileText} name="Contract" />
        </TabsContent>
      )}

      <TabsContent value="integrations">
        <PlaceholderTab icon={IconLink} name="Integrations" />
      </TabsContent>
    </Tabs>
  );
}
