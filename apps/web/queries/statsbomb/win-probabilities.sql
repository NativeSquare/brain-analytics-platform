SELECT 
  tm.match_id,
  tm.team_id,
  tms.win_probability as win_probability,
  tms.draw_probability as draw_probability,
  tms.loss_probability as loss_probability
FROM gold.team_matches tm
LEFT JOIN gold.match_expected_stats tms
  ON tm.match_id = tms.match_id AND tm.team_id = tms.team_id
WHERE tm.match_id = $1
ORDER BY tm.team_id
