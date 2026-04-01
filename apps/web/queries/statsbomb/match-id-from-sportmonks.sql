SELECT tm.match_id
FROM gold.team_matches tm
INNER JOIN config.team_mapping m ON tm.team_id = m.statsbomb_team_id
INNER JOIN config.team_mapping o ON tm.opponent_team_id = o.statsbomb_team_id
WHERE m.sportmonks_team_id = $1
  AND o.sportmonks_team_id = $2
  AND tm.match_date = $3
LIMIT 1
