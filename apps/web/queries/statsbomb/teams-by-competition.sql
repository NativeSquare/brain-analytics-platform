SELECT DISTINCT t.team_id, t.team_name
FROM gold.teams t
JOIN gold.team_matches tm ON t.team_id = tm.team_id
WHERE tm.competition_id = $1
ORDER BY t.team_name
