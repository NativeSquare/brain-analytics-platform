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
league_matches AS (
  SELECT
    tm.match_id,
    tm.team_id,
    tm.match_week,
    tm.match_date,
    tm.points,
    tm.goals_scored,
    tm.goals_conceded
  FROM gold.team_matches tm
  JOIN selected_competition sc
    ON tm.competition_id = sc.competition_id
  WHERE tm.season_id = $2
    AND tm.goals_scored IS NOT NULL
    AND tm.goals_conceded IS NOT NULL
    AND tm.competition_stage_name = 'Regular Season'
),
cumulative_table AS (
  SELECT
    lm.match_id,
    lm.team_id,
    lm.match_week,
    SUM(lm.points) OVER (
      PARTITION BY lm.team_id
      ORDER BY lm.match_week ASC NULLS LAST, lm.match_date ASC, lm.match_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )::numeric AS cumulative_points,
    SUM(lm.goals_scored - lm.goals_conceded) OVER (
      PARTITION BY lm.team_id
      ORDER BY lm.match_week ASC NULLS LAST, lm.match_date ASC, lm.match_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )::numeric AS cumulative_goal_diff,
    SUM(lm.goals_scored) OVER (
      PARTITION BY lm.team_id
      ORDER BY lm.match_week ASC NULLS LAST, lm.match_date ASC, lm.match_id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )::numeric AS cumulative_goals_for
  FROM league_matches lm
  WHERE lm.match_week IS NOT NULL
),
ranked_table AS (
  SELECT
    ct.match_id,
    ct.team_id,
    ct.match_week,
    DENSE_RANK() OVER (
      PARTITION BY ct.match_week
      ORDER BY ct.cumulative_points DESC, ct.cumulative_goal_diff DESC, ct.cumulative_goals_for DESC, ct.team_id ASC
    )::numeric AS league_rank,
    COUNT(*) OVER (PARTITION BY ct.match_week)::numeric AS teams_in_week
  FROM cumulative_table ct
),
selected_team_rank AS (
  SELECT
    rt.match_id,
    rt.match_week,
    rt.league_rank,
    ((rt.teams_in_week + 1) / 2.0)::numeric AS league_average_rank
  FROM ranked_table rt
  WHERE rt.team_id = $1
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
  WHERE p.match_id IN (SELECT match_id FROM league_matches)
  GROUP BY p.match_id, p.possession_team_id
)
SELECT
  tm.match_id,
  tm.match_date,
  tm.match_week,
  tm.opponent_team_id,
  o.image_url AS opponent_image_url,
  str.league_rank,
  str.league_average_rank,
  tm.points::numeric AS points,
  COALESCE(mes.expected_points, 0)::numeric AS x_points,
  tm.goals_scored::numeric AS goals_for,
  tm.goals_conceded::numeric AS goals_against,
  (tm.goals_scored - tm.goals_conceded)::numeric AS goal_difference,
  COALESCE(ps_for.shots, 0)::numeric AS shots_for,
  COALESCE(ps_against.shots, 0)::numeric AS shots_against,
  COALESCE(ps_for.xt, 0)::numeric AS xt_for,
  COALESCE(ps_against.xt, 0)::numeric AS xt_against,
  (COALESCE(ps_for.xt, 0) - COALESCE(ps_against.xt, 0))::numeric AS xt_difference,
  COALESCE(ps_for.total_xg, 0)::numeric AS total_xg_for,
  COALESCE(ps_against.total_xg, 0)::numeric AS total_xg_against,
  (COALESCE(ps_for.total_xg, 0) - COALESCE(ps_against.total_xg, 0))::numeric AS xg_difference,
  COALESCE(ps_for.build_up_goals, 0)::numeric AS build_up_goals_for,
  COALESCE(ps_against.build_up_goals, 0)::numeric AS build_up_goals_against,
  COALESCE(ps_for.build_up_shots, 0)::numeric AS build_up_shots_for,
  COALESCE(ps_against.build_up_shots, 0)::numeric AS build_up_shots_against,
  COALESCE(ps_for.build_up_xt, 0)::numeric AS build_up_xt_for,
  COALESCE(ps_against.build_up_xt, 0)::numeric AS build_up_xt_against,
  COALESCE(ps_for.build_up_xg, 0)::numeric AS build_up_xg_for,
  COALESCE(ps_against.build_up_xg, 0)::numeric AS build_up_xg_against,
  COALESCE(ps_for.transition_goals, 0)::numeric AS transition_goals_for,
  COALESCE(ps_against.transition_goals, 0)::numeric AS transition_goals_against,
  COALESCE(ps_for.transition_shots, 0)::numeric AS transition_shots_for,
  COALESCE(ps_against.transition_shots, 0)::numeric AS transition_shots_against,
  COALESCE(ps_for.transition_xt, 0)::numeric AS transition_xt_for,
  COALESCE(ps_against.transition_xt, 0)::numeric AS transition_xt_against,
  COALESCE(ps_for.transition_xg, 0)::numeric AS transition_xg_for,
  COALESCE(ps_against.transition_xg, 0)::numeric AS transition_xg_against,
  COALESCE(ps_for.set_piece_goals, 0)::numeric AS set_piece_goals_for,
  COALESCE(ps_against.set_piece_goals, 0)::numeric AS set_piece_goals_against,
  COALESCE(ps_for.set_piece_shots, 0)::numeric AS set_piece_shots_for,
  COALESCE(ps_against.set_piece_shots, 0)::numeric AS set_piece_shots_against,
  COALESCE(ps_for.set_piece_xt, 0)::numeric AS set_piece_xt_for,
  COALESCE(ps_against.set_piece_xt, 0)::numeric AS set_piece_xt_against,
  COALESCE(ps_for.set_piece_xg, 0)::numeric AS set_piece_xg_for,
  COALESCE(ps_against.set_piece_xg, 0)::numeric AS set_piece_xg_against,
  COALESCE(tms_for.team_match_possession, 0)::numeric * 100 AS possession_for,
  COALESCE(tms_against.team_match_possession, 0)::numeric * 100 AS possession_against,
  COALESCE(tms_for.team_match_successful_passes, 0)::numeric AS passes_for,
  COALESCE(tms_against.team_match_successful_passes, 0)::numeric AS passes_against,
  COALESCE(tms_for.team_match_ppda, 0)::numeric AS ppda_for,
  COALESCE(tms_against.team_match_ppda, 0)::numeric AS ppda_against
FROM gold.team_matches tm
LEFT JOIN config.team_mapping o
  ON tm.opponent_team_id = o.statsbomb_team_id
LEFT JOIN selected_team_rank str
  ON tm.match_id = str.match_id
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
WHERE tm.team_id = $1
  AND tm.season_id = $2
  AND tm.goals_scored IS NOT NULL
  AND tm.goals_conceded IS NOT NULL
ORDER BY tm.match_date ASC, tm.match_week ASC NULLS LAST
