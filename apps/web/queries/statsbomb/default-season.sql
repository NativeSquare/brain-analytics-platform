SELECT season_id
FROM silver.matches
WHERE match_status = 'available'
  AND (home_team_id = $1 OR away_team_id = $1)
ORDER BY match_date DESC
LIMIT 1
