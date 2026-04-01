WITH match_periods AS (
  SELECT
    match_id,
    period,
    MAX(EXTRACT(EPOCH FROM "timestamp"::interval)) AS max_seconds
  FROM silver.events
  WHERE match_id = $1
  GROUP BY match_id, period
), match_time AS (
  SELECT
    match_id,
    period,
    max_seconds AS period_duration,
    COALESCE(
      SUM(max_seconds) OVER (
        PARTITION BY match_id
        ORDER BY period
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS total_time_before_period
  FROM match_periods
), base_events AS (
  SELECT
    e.*,
    FLOOR(
      (
        EXTRACT(EPOCH FROM e.timestamp::interval)
        + COALESCE(mt.total_time_before_period, 0)
      ) / 60
    )::integer AS actual_minute
  FROM silver.events e
  LEFT JOIN match_time mt
    ON e.match_id = mt.match_id
    AND e.period = mt.period
  WHERE e.match_id = $1
), position_map AS (
  SELECT 
    'Goalkeeper' as full_pos, 'GK' as abbrev
  UNION ALL SELECT 'Right Back', 'RB'
  UNION ALL SELECT 'Right Center Back', 'RCB'
  UNION ALL SELECT 'Center Back', 'CB'
  UNION ALL SELECT 'Left Center Back', 'LCB'
  UNION ALL SELECT 'Left Back', 'LB'
  UNION ALL SELECT 'Right Wing Back', 'RWB'
  UNION ALL SELECT 'Left Wing Back', 'LWB'
  UNION ALL SELECT 'Right Defensive Midfield', 'RDM'
  UNION ALL SELECT 'Center Defensive Midfield', 'CDM'
  UNION ALL SELECT 'Left Defensive Midfield', 'LDM'
  UNION ALL SELECT 'Right Midfield', 'RM'
  UNION ALL SELECT 'Right Center Midfield', 'RCM'
  UNION ALL SELECT 'Center Midfield', 'CM'
  UNION ALL SELECT 'Left Center Midfield', 'LCM'
  UNION ALL SELECT 'Left Midfield', 'LM'
  UNION ALL SELECT 'Right Attacking Midfield', 'RAM'
  UNION ALL SELECT 'Center Attacking Midfield', 'CAM'
  UNION ALL SELECT 'Left Attacking Midfield', 'LAM'
  UNION ALL SELECT 'Right Wing', 'RW'
  UNION ALL SELECT 'Left Wing', 'LW'
  UNION ALL SELECT 'Second Striker', 'SS'
  UNION ALL SELECT 'Left Center Forward', 'LCF'
  UNION ALL SELECT 'Center Forward', 'CF'
  UNION ALL SELECT 'Right Center Forward', 'RCF'
  UNION ALL SELECT 'Striker', 'ST'
),
substitutions AS (
  SELECT 
    e.team_name as team,
    e.player_id,
    e.event_id,
    e.timestamp,
    e.period,
    e.actual_minute as substitution_minute,
    sub.substitution_replacement_id as sub_on_player_id
  FROM base_events e
  LEFT JOIN silver.event_substitutions sub ON e.event_id = sub.event_id
  WHERE e.event_type_name = 'Substitution'
    AND e.period <= 4
),
sub_off_map AS (
  SELECT
    team,
    player_id,
    substitution_minute as sub_off_minute,
    event_id as sub_off_event_id,
    "timestamp" as sub_off_timestamp,
    period as sub_off_period
  FROM substitutions
  WHERE player_id IS NOT NULL
),
sub_on_map AS (
  SELECT
    team,
    sub_on_player_id as player_id,
    substitution_minute as sub_on_minute,
    event_id as sub_on_event_id,
    "timestamp" as sub_on_timestamp,
    period as sub_on_period
  FROM substitutions
  WHERE sub_on_player_id IS NOT NULL
),
goals AS (
  SELECT
    e.team_name as team,
    e.player_id,
    ARRAY_AGG(e.actual_minute ORDER BY e.actual_minute) as goal_minutes,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'minute', e.actual_minute,
        'event_id', e.event_id,
        'timestamp', e.timestamp,
        'period', e.period
      )
      ORDER BY e.actual_minute, e.event_id
    ) as goal_events
  FROM base_events e
  INNER JOIN silver.event_shots s ON e.event_id = s.event_id
  WHERE s.shot_outcome_name = 'Goal'
    AND e.period <= 4
  GROUP BY e.team_name, e.player_id
),
assists AS (
  SELECT
    e.team_name as team,
    p.player_id,
    ARRAY_AGG(e.actual_minute ORDER BY e.actual_minute) as assist_minutes,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'minute', e.actual_minute,
        'event_id', e.event_id,
        'timestamp', e.timestamp,
        'period', e.period
      )
      ORDER BY e.actual_minute, e.event_id
    ) as assist_events
  FROM base_events e
  INNER JOIN silver.event_passes p ON e.event_id = p.event_id
  WHERE p.pass_goal_assist = true
  GROUP BY e.team_name, p.player_id
),
own_goals AS (
  SELECT
    e.team_name as team,
    e.player_id,
    ARRAY_AGG(e.actual_minute ORDER BY e.actual_minute) as own_goal_minutes,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'minute', e.actual_minute,
        'event_id', e.event_id,
        'timestamp', e.timestamp,
        'period', e.period
      )
      ORDER BY e.actual_minute, e.event_id
    ) as own_goal_events
  FROM base_events e
  INNER JOIN silver.event_own_goals_against og ON e.event_id = og.event_id
  GROUP BY e.team_name, e.player_id
),
yellow_cards AS (
  SELECT
    e.team_name as team,
    e.player_id,
    ARRAY_AGG(e.actual_minute ORDER BY e.actual_minute) as card_minutes,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'minute', e.actual_minute,
        'event_id', e.event_id,
        'timestamp', e.timestamp,
        'period', e.period
      )
      ORDER BY e.actual_minute, e.event_id
    ) as card_events
  FROM base_events e
  LEFT JOIN silver.event_fouls_committed f ON e.event_id = f.event_id
  LEFT JOIN silver.event_bad_behaviours bb ON e.event_id = bb.event_id
  WHERE e.player_id IS NOT NULL
    AND (
      f.foul_committed_card_name IN ('Yellow Card', 'Second Yellow')
      OR bb.bad_behaviour_card_name IN ('Yellow Card', 'Second Yellow')
    )
  GROUP BY e.team_name, e.player_id
),
red_cards AS (
  SELECT
    e.team_name as team,
    e.player_id,
    ARRAY_AGG(e.actual_minute ORDER BY e.actual_minute) as card_minutes,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'minute', e.actual_minute,
        'event_id', e.event_id,
        'timestamp', e.timestamp,
        'period', e.period
      )
      ORDER BY e.actual_minute, e.event_id
    ) as card_events
  FROM base_events e
  LEFT JOIN silver.event_fouls_committed f ON e.event_id = f.event_id
  LEFT JOIN silver.event_bad_behaviours bb ON e.event_id = bb.event_id
  WHERE e.player_id IS NOT NULL
    AND (
      f.foul_committed_card_name IN ('Red Card', 'Second Yellow')
      OR bb.bad_behaviour_card_name IN ('Red Card', 'Second Yellow')
    )
  GROUP BY e.team_name, e.player_id
),
lineup_positions AS (
  SELECT 
    l.match_id,
    l.team_name,
    l.player_id,
    l.player_name,
    l.player_nickname,
    l.jersey_number,
    l.positions::jsonb as positions_json,
    jsonb_array_elements(l.positions::jsonb) as position_data
  FROM silver.lineups l
  WHERE l.match_id = $1
),
starter_positions AS (
  SELECT DISTINCT ON (match_id, team_name, player_id)
    match_id,
    team_name,
    player_id,
    player_name,
    player_nickname,
    jersey_number,
    (position_data->>'position')::text as position_name,
    (position_data->>'from')::text as position_from
  FROM lineup_positions
  WHERE (position_data->>'from')::text = '00:00:00.000'
  ORDER BY match_id, team_name, player_id, (position_data->>'from')::text
),
all_positions AS (
  SELECT DISTINCT ON (match_id, team_name, player_id)
    match_id,
    team_name,
    player_id,
    player_name,
    player_nickname,
    jersey_number,
    (position_data->>'position')::text as position_name,
    (position_data->>'from')::text as position_from
  FROM lineup_positions
  ORDER BY match_id, team_name, player_id, (position_data->>'from')::text DESC
),
player_positions AS (
  SELECT 
    COALESCE(sp.match_id, ap.match_id) as match_id,
    COALESCE(sp.team_name, ap.team_name) as team_name,
    COALESCE(sp.player_id, ap.player_id) as player_id,
    COALESCE(sp.player_name, ap.player_name) as player_name,
    COALESCE(sp.player_nickname, ap.player_nickname) as player_nickname,
    COALESCE(sp.jersey_number, ap.jersey_number) as jersey_number,
    COALESCE(sp.position_name, ap.position_name) as position_name
  FROM starter_positions sp
  FULL OUTER JOIN all_positions ap 
    ON sp.match_id = ap.match_id 
    AND sp.team_name = ap.team_name 
    AND sp.player_id = ap.player_id
),
team_ids AS (
  SELECT 
    match_id,
    home_team_name as team_name,
    home_team_id as team_id
  FROM silver.matches
  WHERE match_id = $1
  UNION ALL
  SELECT 
    match_id,
    away_team_name as team_name,
    away_team_id as team_id
  FROM silver.matches
  WHERE match_id = $1
)
SELECT 
  pp.match_id,
  pp.team_name,
  COALESCE(pm_table.is_starter, CASE WHEN sp.position_name IS NOT NULL THEN true ELSE false END) as is_starter,
  COALESCE(pos_map.abbrev, UPPER(LEFT(pp.position_name, 3))) as pos,
  CASE 
    WHEN pp.player_nickname IS NOT NULL AND TRIM(pp.player_nickname) != '' 
    THEN pp.player_nickname 
    ELSE pp.player_name 
  END as full_name,
  CASE 
    WHEN pp.player_nickname IS NOT NULL AND TRIM(pp.player_nickname) != '' THEN
      CASE 
        WHEN array_length(string_to_array(pp.player_nickname, ' '), 1) > 1 THEN
          LEFT((string_to_array(pp.player_nickname, ' '))[1], 1) || '.' || (string_to_array(pp.player_nickname, ' '))[array_length(string_to_array(pp.player_nickname, ' '), 1)]
        ELSE pp.player_nickname
      END
    ELSE
      CASE 
        WHEN array_length(string_to_array(pp.player_name, ' '), 1) > 1 THEN
          LEFT((string_to_array(pp.player_name, ' '))[1], 1) || '.' || (string_to_array(pp.player_name, ' '))[array_length(string_to_array(pp.player_name, ' '), 1)]
        ELSE pp.player_name
      END
  END as player,
  COALESCE(pm_table.minutes_played::integer, 0) as mins,
  COALESCE(g.goal_minutes, ARRAY[]::integer[]) as goals,
  COALESCE(g.goal_events, '[]'::jsonb) as goal_events,
  COALESCE(a.assist_minutes, ARRAY[]::integer[]) as assists,
  COALESCE(a.assist_events, '[]'::jsonb) as assist_events,
  COALESCE(og.own_goal_minutes, ARRAY[]::integer[]) as own_goals,
  COALESCE(og.own_goal_events, '[]'::jsonb) as own_goal_events,
  COALESCE(yc.card_minutes, ARRAY[]::integer[]) as yellow_cards,
  COALESCE(yc.card_events, '[]'::jsonb) as yellow_card_events,
  COALESCE(rc.card_minutes, ARRAY[]::integer[]) as red_cards,
  COALESCE(rc.card_events, '[]'::jsonb) as red_card_events,
  so.sub_off_minute as sub_off_time,
  so.sub_off_event_id,
  so.sub_off_timestamp,
  so.sub_off_period,
  son.sub_on_minute as sub_on_time,
  son.sub_on_event_id,
  son.sub_on_timestamp,
  son.sub_on_period
FROM player_positions pp
LEFT JOIN team_ids ti ON pp.match_id = ti.match_id AND pp.team_name = ti.team_name
LEFT JOIN gold.player_matches pm_table 
  ON pp.match_id = pm_table.match_id 
  AND pp.player_id = pm_table.player_id
  AND ti.team_id = pm_table.team_id
LEFT JOIN position_map pos_map ON pp.position_name = pos_map.full_pos
LEFT JOIN starter_positions sp ON pp.match_id = sp.match_id 
  AND pp.team_name = sp.team_name 
  AND pp.player_id = sp.player_id
LEFT JOIN sub_off_map so ON pp.team_name = so.team AND pp.player_id = so.player_id
LEFT JOIN sub_on_map son ON pp.team_name = son.team AND pp.player_id = son.player_id
LEFT JOIN goals g ON pp.team_name = g.team AND pp.player_id = g.player_id
LEFT JOIN assists a ON pp.team_name = a.team AND pp.player_id = a.player_id
LEFT JOIN own_goals og ON pp.team_name = og.team AND pp.player_id = og.player_id
LEFT JOIN yellow_cards yc ON pp.team_name = yc.team AND pp.player_id = yc.player_id
LEFT JOIN red_cards rc ON pp.team_name = rc.team AND pp.player_id = rc.player_id
WHERE (COALESCE(pm_table.is_starter, CASE WHEN sp.position_name IS NOT NULL THEN true ELSE false END) 
  OR COALESCE(pm_table.minutes_played, 0) > 0
  OR pp.position_name IS NOT NULL)
ORDER BY 
  pp.team_name,
  CASE COALESCE(pm_table.is_starter, CASE WHEN sp.position_name IS NOT NULL THEN true ELSE false END) WHEN true THEN 0 ELSE 1 END,
  CASE 
    WHEN COALESCE(pm_table.is_starter, CASE WHEN sp.position_name IS NOT NULL THEN true ELSE false END) = true THEN
      CASE COALESCE(pos_map.abbrev, UPPER(LEFT(pp.position_name, 3)))
        WHEN 'GK' THEN 1 WHEN 'LB' THEN 2 WHEN 'LWB' THEN 3 WHEN 'LCB' THEN 4 
        WHEN 'CB' THEN 5 WHEN 'RCB' THEN 6 WHEN 'RB' THEN 7 WHEN 'RWB' THEN 8
        WHEN 'LDM' THEN 9 WHEN 'CDM' THEN 10 WHEN 'RDM' THEN 11
        WHEN 'LCM' THEN 12 WHEN 'CM' THEN 13 WHEN 'RCM' THEN 14
        WHEN 'LAM' THEN 15 WHEN 'LW' THEN 16 WHEN 'CAM' THEN 17 WHEN 'RAM' THEN 18 WHEN 'RW' THEN 19
        WHEN 'SS' THEN 20 WHEN 'LCF' THEN 21 WHEN 'CF' THEN 22 WHEN 'RCF' THEN 23 WHEN 'ST' THEN 24
        ELSE 99
      END
    ELSE 0
  END,
  CASE 
    WHEN COALESCE(pm_table.is_starter, CASE WHEN sp.position_name IS NOT NULL THEN true ELSE false END) = false THEN
      -COALESCE(pm_table.minutes_played::integer, 0)
    ELSE 0
  END,
  CASE COALESCE(pos_map.abbrev, UPPER(LEFT(pp.position_name, 3)))
    WHEN 'GK' THEN 1 WHEN 'LB' THEN 2 WHEN 'LWB' THEN 3 WHEN 'LCB' THEN 4 
    WHEN 'CB' THEN 5 WHEN 'RCB' THEN 6 WHEN 'RB' THEN 7 WHEN 'RWB' THEN 8
    WHEN 'LDM' THEN 9 WHEN 'CDM' THEN 10 WHEN 'RDM' THEN 11
    WHEN 'LCM' THEN 12 WHEN 'CM' THEN 13 WHEN 'RCM' THEN 14
    WHEN 'LAM' THEN 15 WHEN 'LW' THEN 16 WHEN 'CAM' THEN 17 WHEN 'RAM' THEN 18 WHEN 'RW' THEN 19
    WHEN 'SS' THEN 20 WHEN 'LCF' THEN 21 WHEN 'CF' THEN 22 WHEN 'RCF' THEN 23 WHEN 'ST' THEN 24
    ELSE 99
  END,
  player
