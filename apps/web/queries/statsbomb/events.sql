WITH match_periods AS (
  SELECT 
    match_id,
    period,
    MAX(EXTRACT(EPOCH FROM "timestamp"::interval)) as max_seconds
  FROM silver.events
  WHERE match_id = $1
  GROUP BY match_id, period
), match_time AS (
  SELECT 
    match_id,
    period,
    max_seconds as period_duration,
    COALESCE(
      SUM(max_seconds) OVER (
        PARTITION BY match_id 
        ORDER BY period 
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ), 
      0
    ) as total_time_before_period
  FROM match_periods
  ORDER BY period
)
SELECT
  e.event_id,
  e.match_id,
  e.index,
  e.period,
  e.team_id,
  e.team_name AS team,
  e.event_type_id,
  e.event_type_name AS type,
  e.minute,
  e.second,
  e.timestamp,
  e.location_x,
  e.location_y,
  e.player_id,
  e.player_name,
  e.under_pressure,
  e.obv_for_net,
  e.obv_total_net,
  p.pass_recipient_id,
  p.pass_recipient_name,
  p.pass_outcome_name AS pass_outcome,
  p.pass_end_location_x,
  p.pass_end_location_y,
  sub.substitution_replacement_id,
  s.shot_outcome_name AS shot_outcome,
  s.shot_statsbomb_xg AS shot_statsbomb_xg,
  f.foul_committed_card_name,
  bb.bad_behaviour_card_name,
  EXTRACT(EPOCH FROM e.timestamp::interval) + mt.total_time_before_period as event_time,
  mt.total_time_before_period AS period_start_seconds
FROM silver.events e
LEFT JOIN silver.event_passes p ON e.event_id = p.event_id
LEFT JOIN silver.event_substitutions sub ON e.event_id = sub.event_id
LEFT JOIN silver.event_shots s ON e.event_id = s.event_id
LEFT JOIN silver.event_fouls_committed f ON e.event_id = f.event_id
LEFT JOIN silver.event_bad_behaviours bb ON e.event_id = bb.event_id
LEFT JOIN match_time mt ON e.match_id = mt.match_id AND e.period = mt.period
WHERE e.match_id = $1
ORDER BY e.index
