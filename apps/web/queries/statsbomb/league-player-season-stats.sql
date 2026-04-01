SELECT
    p.*
FROM silver.player_season_stats p
WHERE p.competition_id = $1
  AND p.season_id = $2
  AND p.player_season_minutes > $3
ORDER BY p.player_name;
