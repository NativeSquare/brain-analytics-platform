SELECT 
  tm.match_id, 
  tm.team_id, 
  COALESCE(SUM(goal), 0)::numeric as goals, 
  COALESCE(SUM(successful_pass_non_shot_obv_for_net), 0)::numeric as xt, 
  COALESCE(SUM(total_xg), 0)::numeric as total_xg,
  COALESCE(SUM(CASE WHEN phase = 'Build-up' THEN total_xg ELSE 0 END), 0)::numeric as build_up_xg, 
  COALESCE(SUM(CASE WHEN phase = 'Transition' THEN total_xg ELSE 0 END), 0)::numeric as transition_xg, 
  COALESCE(SUM(CASE WHEN phase = 'Set Piece' THEN total_xg ELSE 0 END), 0)::numeric as set_piece_xg,
  COALESCE(SUM(shot_count), 0)::numeric as shots,
  COALESCE(AVG(tms.team_match_successful_passes), 0)::numeric as passes,
  COALESCE(AVG(tms.team_match_possession), 0)::numeric * 100 as possession,
  COALESCE(AVG(tms.team_match_ppda), 0)::numeric as ppda
FROM gold.team_matches tm 
LEFT JOIN gold.possessions p 
  ON tm.match_id = p.match_id AND tm.team_id = p.possession_team_id
LEFT JOIN silver.team_match_stats tms
  ON tm.match_id = tms.match_id AND tm.team_id = tms.team_id
WHERE tm.match_id = $1 
GROUP BY tm.match_id, tm.team_id
