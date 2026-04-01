SELECT
  sp.match_id,
  sp.start_event_id,
  sp.team_id,
  t.team_name,
  sp.period,
  se.timestamp AS start_time,
  ee.timestamp AS end_time,
  sp.sp_type,
  sp.sp_zone,
  sp.side,
  sp.technique,
  sp.taker_id,
  se.location_x,
  se.location_y,
  p_taker.player_name AS taker,
  ds.shot_outcome_name,
  ds.shot_statsbomb_xg,
  ds.shot_shot_execution_xg,
  ds.shot_end_location_x,
  ds.shot_end_location_y,
  ds.shot_end_location_z,
  sp.delivered_first_phase,
  sp.is_short,
  sp.is_long_throw,
  sp.is_direct_sp,
  sp.target,
  sp.shots,
  CASE WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.penalty_scored, p.goal, sp.goal, 0) ELSE 0 END AS goal,
  CASE WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.penalty_xg, p.total_xg, sp.xg, 0) ELSE 0 END AS xg,
  sp.delivered_first_phase_player_id,
  p_delivered.player_name AS delivered_first_phase_player,
  sp.delivered_first_phase_event_id,
  sp.first_phase_first_contact_player_id,
  p_contact.player_name AS first_phase_first_contact_player,
  sp.first_contact_won,
  sp.first_phase_first_contact_event_id,
  sp.first_phase_first_contact_x,
  sp.first_phase_first_contact_y,
  sp.first_phase_first_contact_team_id,
  CASE WHEN es.event_id IS NOT NULL THEN true ELSE false END AS first_phase_first_contact_shot,
  CASE WHEN es.shot_outcome_id = 97 THEN true ELSE false END AS first_phase_first_contact_goal,
  es.shot_statsbomb_xg AS first_phase_first_contact_xg,
  sp.second_ball_won,
  sp.second_ball_event_id,
  sp.second_ball_x,
  sp.second_ball_y,
  sp.penalty_event_id
FROM gold.set_pieces sp
JOIN silver.events se ON sp.start_event_id = se.event_id
JOIN silver.events ee ON sp.end_event_id = ee.event_id
LEFT JOIN gold.possessions p ON p.start_event_id = sp.start_event_id
LEFT JOIN silver.event_shots ds ON ds.event_id = sp.start_event_id
LEFT JOIN silver.event_shots es ON es.event_id = sp.first_phase_first_contact_event_id
LEFT JOIN gold.players p_taker ON sp.taker_id = p_taker.player_id
LEFT JOIN gold.players p_delivered ON sp.delivered_first_phase_player_id = p_delivered.player_id
LEFT JOIN gold.players p_contact ON sp.first_phase_first_contact_player_id = p_contact.player_id
LEFT JOIN gold.teams t ON sp.team_id = t.team_id
WHERE sp.match_id = $1
