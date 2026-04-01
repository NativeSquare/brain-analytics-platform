SELECT 
    p.*,
    g.date_of_birth,
    g.height,
    g.weight,
    g.country_name,
    g.gender
FROM silver.player_season_stats p
LEFT JOIN gold.players g ON p.player_id = g.player_id
WHERE p.player_id = $1
AND p.competition_id = $2
AND p.season_id = $3
LIMIT 1;