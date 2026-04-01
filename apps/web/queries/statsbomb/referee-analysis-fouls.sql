SELECT
  m.referee_id,
  m.referee_name,
  m.match_id,
  m.match_date,
  CONCAT(m.match_date, ' ', m.home_team_name, ' v ', m.away_team_name) AS match_label,
  m.season_id,
  m.competition_id,
  f.event_id,
  e.period,
  e.timestamp,
  f.foul_committed_advantage,
  f.foul_committed_card_id,
  f.foul_committed_card_name,
  f.foul_committed_offensive,
  f.foul_committed_penalty,
  f.foul_committed_type_id,
  f.foul_committed_type_name,
  f.player_id,
  p.player_name
FROM silver.matches m
LEFT JOIN silver.event_fouls_committed f ON m.match_id = f.match_id
LEFT JOIN silver.events e ON f.event_id = e.event_id
LEFT JOIN gold.players p ON f.player_id = p.player_id
WHERE m.referee_id = $1
  AND m.match_status = 'available'
  AND f.event_id IS NOT NULL
  AND ($2::int IS NULL OR m.competition_id = $2)
ORDER BY m.match_date DESC, e.period DESC, e.timestamp DESC

