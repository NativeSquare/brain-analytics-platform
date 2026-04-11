/**
 * Mock data for the Medical Overview dashboard.
 * Story 14.3 AC #18: All dashboard data is mock/hardcoded.
 */

// ---------------------------------------------------------------------------
// Squad Availability
// ---------------------------------------------------------------------------

export interface SquadAvailability {
  totalPlayers: number;
  injuredPlayers: number;
  availablePercentage: number;
  previousMonthPercentage: number;
  trend: "up" | "down" | "flat";
}

export const mockSquadAvailability: SquadAvailability = {
  totalPlayers: 25,
  injuredPlayers: 4,
  availablePercentage: 84,
  previousMonthPercentage: 80,
  trend: "up",
};

// ---------------------------------------------------------------------------
// Currently Injured Players
// ---------------------------------------------------------------------------

export interface InjuredPlayer {
  id: string;
  playerName: string;
  injuryType: string;
  rtpStatus: string;
  daysOut: number;
  expectedReturn: string;
}

export const mockCurrentlyInjured: InjuredPlayer[] = [
  {
    id: "inj-1",
    playerName: "Marcus Johnson",
    injuryType: "Hamstring strain",
    rtpStatus: "rehab",
    daysOut: 21,
    expectedReturn: "25/04/2026",
  },
  {
    id: "inj-2",
    playerName: "James Williams",
    injuryType: "ACL tear",
    rtpStatus: "active",
    daysOut: 84,
    expectedReturn: "15/07/2026",
  },
  {
    id: "inj-3",
    playerName: "Oliver Thompson",
    injuryType: "Ankle sprain",
    rtpStatus: "assessment",
    daysOut: 14,
    expectedReturn: "18/04/2026",
  },
  {
    id: "inj-4",
    playerName: "Daniel Roberts",
    injuryType: "Calf strain",
    rtpStatus: "rehab",
    daysOut: 10,
    expectedReturn: "20/04/2026",
  },
  {
    id: "inj-5",
    playerName: "Thomas Mitchell",
    injuryType: "Groin strain",
    rtpStatus: "active",
    daysOut: 5,
    expectedReturn: "28/04/2026",
  },
  {
    id: "inj-6",
    playerName: "Ryan Carter",
    injuryType: "Concussion",
    rtpStatus: "assessment",
    daysOut: 7,
    expectedReturn: "16/04/2026",
  },
  {
    id: "inj-7",
    playerName: "Ethan Davis",
    injuryType: "Knee contusion",
    rtpStatus: "rehab",
    daysOut: 12,
    expectedReturn: "22/04/2026",
  },
];

// ---------------------------------------------------------------------------
// Upcoming Returns (within 14 days)
// ---------------------------------------------------------------------------

export interface UpcomingReturn {
  id: string;
  playerName: string;
  injuryType: string;
  expectedReturnDate: string;
  daysUntilReturn: number;
}

export const mockUpcomingReturns: UpcomingReturn[] = [
  {
    id: "ret-1",
    playerName: "Ryan Carter",
    injuryType: "Concussion",
    expectedReturnDate: "16/04/2026",
    daysUntilReturn: 5,
  },
  {
    id: "ret-2",
    playerName: "Oliver Thompson",
    injuryType: "Ankle sprain",
    expectedReturnDate: "18/04/2026",
    daysUntilReturn: 7,
  },
  {
    id: "ret-3",
    playerName: "Daniel Roberts",
    injuryType: "Calf strain",
    expectedReturnDate: "20/04/2026",
    daysUntilReturn: 9,
  },
  {
    id: "ret-4",
    playerName: "Ethan Davis",
    injuryType: "Knee contusion",
    expectedReturnDate: "22/04/2026",
    daysUntilReturn: 11,
  },
];

// ---------------------------------------------------------------------------
// Injury by Body Region
// ---------------------------------------------------------------------------

export interface InjuryByRegion {
  region: string;
  count: number;
}

export const mockInjuryByRegion: InjuryByRegion[] = [
  { region: "Hamstring", count: 8 },
  { region: "Knee", count: 6 },
  { region: "Ankle", count: 5 },
  { region: "Calf", count: 4 },
  { region: "Groin", count: 3 },
  { region: "Shoulder", count: 3 },
  { region: "Head/Neck", count: 2 },
  { region: "Foot", count: 2 },
  { region: "Back", count: 2 },
  { region: "Hip", count: 1 },
];

// ---------------------------------------------------------------------------
// Injury by Type
// ---------------------------------------------------------------------------

export interface InjuryByType {
  type: string;
  count: number;
  color: string;
}

export const mockInjuryByType: InjuryByType[] = [
  { type: "Muscle strain", count: 12, color: "#ef4444" },
  { type: "Ligament sprain", count: 7, color: "#f59e0b" },
  { type: "Fracture", count: 3, color: "#3b82f6" },
  { type: "Contusion", count: 4, color: "#8b5cf6" },
  { type: "Tendinitis", count: 2, color: "#10b981" },
  { type: "Concussion", count: 2, color: "#6366f1" },
];
