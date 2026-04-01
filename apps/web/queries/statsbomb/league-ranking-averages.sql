WITH selected_competition AS (
  SELECT tm.competition_id
  FROM gold.team_matches tm
  WHERE tm.team_id = $1
    AND tm.season_id = $2
    AND tm.goals_scored IS NOT NULL
    AND tm.goals_conceded IS NOT NULL
    AND tm.competition_stage_name = 'Regular Season'
  ORDER BY tm.match_date DESC
  LIMIT 1
),
league_matches_base AS (
  SELECT tm.match_id
  FROM gold.team_matches tm
  JOIN selected_competition sc
    ON tm.competition_id = sc.competition_id
  WHERE tm.season_id = $2
    AND tm.goals_scored IS NOT NULL
    AND tm.goals_conceded IS NOT NULL
    AND tm.competition_stage_name = 'Regular Season'
),
possession_stats AS (
  SELECT
    p.match_id,
    p.possession_team_id AS team_id,
    COALESCE(SUM(p.shot_count), 0)::numeric AS shots,
    COALESCE(SUM(p.successful_pass_non_shot_obv_for_net), 0)::numeric AS xt,
    COALESCE(SUM(p.total_xg), 0)::numeric AS total_xg,
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.phase, '')) = 'build-up' AND COALESCE(p.SP, 0) = 0 THEN p.goal ELSE 0 END), 0)::numeric AS build_up_goals,
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.phase, '')) = 'build-up' AND COALESCE(p.SP, 0) = 0 THEN p.shot_count ELSE 0 END), 0)::numeric AS build_up_shots,
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.phase, '')) = 'build-up' AND COALESCE(p.SP, 0) = 0 THEN p.successful_pass_non_shot_obv_for_net ELSE 0 END), 0)::numeric AS build_up_xt,
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.phase, '')) = 'build-up' AND COALESCE(p.SP, 0) = 0 THEN p.total_xg ELSE 0 END), 0)::numeric AS build_up_xg,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'transition' OR COALESCE(p.transition, 0) = 1) THEN p.goal ELSE 0 END), 0)::numeric AS transition_goals,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'transition' OR COALESCE(p.transition, 0) = 1) THEN p.shot_count ELSE 0 END), 0)::numeric AS transition_shots,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'transition' OR COALESCE(p.transition, 0) = 1) THEN p.successful_pass_non_shot_obv_for_net ELSE 0 END), 0)::numeric AS transition_xt,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'transition' OR COALESCE(p.transition, 0) = 1) THEN p.total_xg ELSE 0 END), 0)::numeric AS transition_xg,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'set piece' OR COALESCE(p.SP, 0) = 1) THEN p.goal ELSE 0 END), 0)::numeric AS set_piece_goals,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'set piece' OR COALESCE(p.SP, 0) = 1) THEN p.shot_count ELSE 0 END), 0)::numeric AS set_piece_shots,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'set piece' OR COALESCE(p.SP, 0) = 1) THEN p.successful_pass_non_shot_obv_for_net ELSE 0 END), 0)::numeric AS set_piece_xt,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'set piece' OR COALESCE(p.SP, 0) = 1) THEN p.total_xg ELSE 0 END), 0)::numeric AS set_piece_xg
  FROM gold.possessions p
  WHERE p.match_id IN (SELECT match_id FROM league_matches_base)
  GROUP BY p.match_id, p.possession_team_id
),
league_matches AS (
  SELECT
    tm.match_id,
    tm.team_id,
    tm.team_name,
    MAX(tm_map.image_url) AS team_image_url,
    AVG({{METRIC_SQL}})::numeric AS metric_value
  FROM gold.team_matches tm
  JOIN selected_competition sc
    ON tm.competition_id = sc.competition_id
  LEFT JOIN config.team_mapping tm_map
    ON tm.team_id = tm_map.statsbomb_team_id
  LEFT JOIN gold.match_expected_stats mes
    ON tm.match_id = mes.match_id AND tm.team_id = mes.team_id
  LEFT JOIN possession_stats ps_for
    ON tm.match_id = ps_for.match_id AND tm.team_id = ps_for.team_id
  LEFT JOIN possession_stats ps_against
    ON tm.match_id = ps_against.match_id AND tm.opponent_team_id = ps_against.team_id
  LEFT JOIN silver.team_match_stats tms_for
    ON tm.match_id = tms_for.match_id AND tm.team_id = tms_for.team_id
  LEFT JOIN silver.team_match_stats tms_against
    ON tm.match_id = tms_against.match_id AND tm.opponent_team_id = tms_against.team_id
  WHERE tm.match_id IN (SELECT match_id FROM league_matches_base)
  GROUP BY tm.match_id, tm.team_id, tm.team_name
),
team_average_metric AS (
  SELECT
    lm.team_id,
    MAX(lm.team_name) AS team_name,
    MAX(lm.team_image_url) AS team_image_url,
    AVG(lm.metric_value)::numeric AS average_value,
    FALSE AS is_average
  FROM league_matches lm
  GROUP BY lm.team_id
),
league_average_row AS (
  SELECT
    NULL::int AS team_id,
    'League Average'::text AS team_name,
    NULL::text AS team_image_url,
    AVG(tam.average_value)::numeric AS average_value,
    TRUE AS is_average
  FROM team_average_metric tam
)
SELECT team_id, team_name, team_image_url, average_value, is_average
FROM team_average_metric
UNION ALL
SELECT team_id, team_name, team_image_url, average_value, is_average
FROM league_average_row
ORDER BY average_value {{SORT_DIRECTION}}, team_name ASC
