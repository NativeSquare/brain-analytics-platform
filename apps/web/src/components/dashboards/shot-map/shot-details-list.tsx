"use client";

import type { Shot } from "./types";

const formatNumber = (value: number | null) =>
  value == null || Number.isNaN(value) ? "\u2014" : value.toFixed(3);

interface ShotDetailsListProps {
  activeShot: Shot;
  allTeamShots: boolean;
}

const ShotDetailsList = ({ activeShot, allTeamShots }: ShotDetailsListProps) => {
  return (
    <div className="grid grid-cols-1 gap-2 text-sm">
      {allTeamShots && activeShot.selected_team_name && activeShot.opposition_team_name && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Match</span>
          <span>
            {activeShot.selected_team_name} v {activeShot.opposition_team_name}
            {activeShot.match_date ? ` ${activeShot.match_date.split("T")[0]}` : ""}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Half</span>
        <span>{activeShot.period ?? "\u2014"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Timestamp</span>
        <span>{activeShot.timestamp ?? "\u2014"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Player</span>
        <span>{activeShot.player_name ?? "\u2014"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Body Part</span>
        <span>{activeShot.shot_body_part_name ?? "\u2014"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Shot xG</span>
        <span>{formatNumber(activeShot.shot_statsbomb_xg)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Shot Execution xG</span>
        <span>{formatNumber(activeShot.shot_shot_execution_xg)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Outcome</span>
        <span>{activeShot.shot_outcome_name ?? "\u2014"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Phase of Play</span>
        <span>{activeShot.phase ?? "\u2014"}</span>
      </div>
    </div>
  );
};

export default ShotDetailsList;
