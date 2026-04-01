SELECT DISTINCT 
    p.player_id, 
    COALESCE(g.player_name, p.player_name) AS player_name, 
    p.team_id, 
    p.team_name, 
    p.primary_position,
    p.player_season_minutes
FROM silver.player_season_stats p
LEFT JOIN gold.players g ON p.player_id = g.player_id
WHERE p.competition_id = $1
AND p.season_id = $2
AND ($3::bigint IS NULL OR p.team_id = $3::bigint)
AND ($4::text IS NULL OR p.primary_position = $4::text)
AND (
  $5::text IS NULL
  OR translate(
    lower(COALESCE(g.player_name, p.player_name)),
    'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝáàâãäåçéèêëíìîïñóòôõöúùûüýÿ',
    'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
  ) LIKE '%' || translate(
    lower($5::text),
    'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝáàâãäåçéèêëíìîïñóòôõöúùûüýÿ',
    'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
  ) || '%'
)
ORDER BY player_name;