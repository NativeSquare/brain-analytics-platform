SELECT
  e.event_id,
  e.location_x,
  e.location_y,
  e.player_name,
  e.period,
  e.timestamp,
  e.under_pressure,
  e.team_name,
  e.team_id,
  m.match_id,
  m.match_date,
  CASE
    WHEN m.home_team_id = $1 THEN m.home_team_name
    ELSE m.away_team_name
  END AS selected_team_name,
  CASE
    WHEN m.home_team_id = $1 THEN m.away_team_name
    ELSE m.home_team_name
  END AS opposition_team_name,
  shot_body_part_name,
  shot_end_location_x,
  shot_end_location_y,
  shot_end_location_z,
  shot_first_time,
  shot_gk_positioning_xg_suppression,
  shot_gk_save_difficulty_xg,
  shot_gk_shot_stopping_xg_suppression,
  shot_outcome_name,
  shot_shot_execution_xg,
  shot_shot_execution_xg_uplift,
  shot_statsbomb_xg,
  shot_technique_name,
  shot_type_name,
  phase,
  p.set_piece_type,
  p.penalty_won,
  p.penalty_scored,
  p.penalty_xg,
  p.start_time,
  p.end_time
FROM silver.events e
JOIN silver.event_shots s ON e.event_id = s.event_id
JOIN silver.matches m ON e.match_id = m.match_id
LEFT JOIN gold.possessions p ON e.match_id = p.match_id AND e.index >= p.start_index AND e.index <= p.end_index
WHERE e.team_id = $1
  AND m.match_status = 'available'
  AND e.period IN (1, 2, 3, 4)
  {{SEASON_FILTER}}
