SELECT
  match_id,
  start_event_id,
  end_event_id,
  possession_team,
  out_of_possession_team,
  possession_team_id,
  out_of_possession_team_id,
  start_index,
  end_index,
  period,
  start_time,
  end_time,
  regain,
  restart,
  phase,
  quick_restart,
  possession_type,
  third AS starting_third,
  successful_pass_non_shot_obv_total_net AS xT,
  shot_count,
  total_xg,
  goal,
  duration_seconds
FROM gold.possessions
WHERE match_id = $1
ORDER BY start_index
