SELECT
  tm.match_id,
  tm.season_id,
  tm.competition_id,
  tm.match_date,
  CONCAT(tm.match_date, ' ', team_name, ' v ', opponent_team_name, CASE WHEN venue = 'home' THEN ' (H)' ELSE ' (A)' END) AS match_label,
  team_name,
  opponent_team_name,
  team_id,
  opponent_team_id,
  m.sportmonks_team_id,
  o.sportmonks_team_id AS opponent_sportmonks_team_id,
  m.image_url,
  o.image_url AS opponent_image_url,
  venue,
  tm.competition_stage_name,
  tm.match_week,
  stadium_name,
  referee_name,
  competition_name,
  season_name
FROM gold.team_matches tm
LEFT JOIN config.team_mapping m
  ON tm.team_id = m.statsbomb_team_id
LEFT JOIN config.team_mapping o
  ON tm.opponent_team_id = o.statsbomb_team_id
LEFT JOIN silver.matches ma
  ON tm.match_id = ma.match_id
WHERE {{FILTERS}}
ORDER BY tm.match_date DESC
