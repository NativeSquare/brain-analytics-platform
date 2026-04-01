SELECT 
  tm.match_id,
  tm.match_date,
  tm.match_week,
  tm.venue,
  tm.goals_scored,
  tm.goals_conceded,
  tm.points,
  tm.opponent_team_id,
  o.image_url as opponent_image_url,
  COALESCE(m.expected_points, 0)::numeric as x_points
FROM gold.team_matches tm
LEFT JOIN config.team_mapping o 
  ON tm.opponent_team_id = o.statsbomb_team_id
LEFT JOIN gold.match_expected_stats m 
  ON tm.match_id = m.match_id AND tm.team_id = m.team_id
WHERE tm.team_id = $1
  AND tm.season_id = $2
  AND tm.competition_id = $3
  AND tm.goals_scored IS NOT NULL
  AND tm.goals_conceded IS NOT NULL
  AND tm.competition_stage_name = 'Regular Season'
ORDER BY tm.match_week ASC NULLS LAST
