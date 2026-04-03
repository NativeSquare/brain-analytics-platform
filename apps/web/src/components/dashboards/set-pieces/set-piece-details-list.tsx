"use client";

import type { SetPiece, SetPieceMode } from "./types";
import { getMatchMinute } from "./utils";

const fmt = (v: number | null) =>
  v == null || Number.isNaN(v) ? "\u2014" : v.toFixed(3);

const bool = (v: boolean | null) =>
  v == null ? "\u2014" : v ? "Yes" : "No";

interface SetPieceDetailsListProps {
  item: SetPiece;
  mode: SetPieceMode;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value ?? "\u2014"}</span>
    </div>
  );
}

const SetPieceDetailsList = ({ item, mode }: SetPieceDetailsListProps) => {
  const minute = getMatchMinute(item.start_time, item.period);
  const minuteStr = minute != null ? `${Math.floor(minute)}'` : "\u2014";

  return (
    <div className="grid grid-cols-1 gap-2 text-sm">
      <Row label="Type" value={item.sp_type ?? "\u2014"} />
      <Row label="Half" value={item.period ?? "\u2014"} />
      <Row label="Minute" value={minuteStr} />
      <Row label="Taker" value={item.taker ?? "\u2014"} />
      <Row label="Side" value={item.side ?? "\u2014"} />
      <Row label="Technique" value={item.technique ?? "\u2014"} />
      <Row label="Team" value={item.team_name ?? "\u2014"} />
      <Row label="Short" value={bool(item.is_short)} />

      {mode === "indirect" && (
        <>
          <Row label="Target" value={item.target ?? "\u2014"} />
          <Row
            label="1st Contact"
            value={item.first_phase_first_contact_player ?? "\u2014"}
          />
          <Row label="1st Contact Won" value={bool(item.first_contact_won)} />
          <Row
            label="1st Contact Shot"
            value={bool(item.first_phase_first_contact_shot)}
          />
          <Row
            label="1st Contact Goal"
            value={bool(item.first_phase_first_contact_goal)}
          />
          <Row
            label="1st Contact xG"
            value={fmt(item.first_phase_first_contact_xg)}
          />
        </>
      )}

      {mode === "direct" && (
        <>
          <Row label="Outcome" value={item.shot_outcome_name ?? "\u2014"} />
          <Row label="xG" value={fmt(item.shot_statsbomb_xg)} />
          <Row label="Exec xG" value={fmt(item.shot_shot_execution_xg)} />
        </>
      )}

      <Row label="Goal" value={item.goal ?? "\u2014"} />
      <Row label="xG (total)" value={fmt(item.xg)} />
    </div>
  );
};

export default SetPieceDetailsList;
