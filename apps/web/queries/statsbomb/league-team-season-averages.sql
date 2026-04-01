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
)
SELECT
  tm.team_id,
  MAX(tm.team_name) AS team_name,
  MAX(tm_map.image_url) AS team_image_url,
  AVG(tm.points)::numeric AS points,
  AVG(COALESCE(mes.expected_points, 0))::numeric AS x_points,
  AVG(tm.goals_scored)::numeric AS goals_for,
  AVG(tm.goals_conceded)::numeric AS goals_against,
  AVG(tm.goals_scored - tm.goals_conceded)::numeric AS goal_difference,
  AVG(COALESCE(ps_for.shots, 0))::numeric AS shots_for,
  AVG(COALESCE(ps_against.shots, 0))::numeric AS shots_against,
  AVG(COALESCE(ps_for.xt, 0))::numeric AS xt_for,
  AVG(COALESCE(ps_against.xt, 0))::numeric AS xt_against,
  AVG(COALESCE(ps_for.xt, 0) - COALESCE(ps_against.xt, 0))::numeric AS xt_difference,
  AVG(COALESCE(ps_for.total_xg, 0))::numeric AS total_xg_for,
  AVG(COALESCE(ps_against.total_xg, 0))::numeric AS total_xg_against,
  AVG(COALESCE(ps_for.total_xg, 0) - COALESCE(ps_against.total_xg, 0))::numeric AS xg_difference,
  AVG(COALESCE(ps_for.build_up_goals, 0))::numeric AS build_up_goals_for,
  AVG(COALESCE(ps_against.build_up_goals, 0))::numeric AS build_up_goals_against,
  AVG(COALESCE(ps_for.build_up_shots, 0))::numeric AS build_up_shots_for,
  AVG(COALESCE(ps_against.build_up_shots, 0))::numeric AS build_up_shots_against,
  AVG(COALESCE(ps_for.build_up_xt, 0))::numeric AS build_up_xt_for,
  AVG(COALESCE(ps_against.build_up_xt, 0))::numeric AS build_up_xt_against,
  AVG(COALESCE(ps_for.build_up_xg, 0))::numeric AS build_up_xg_for,
  AVG(COALESCE(ps_against.build_up_xg, 0))::numeric AS build_up_xg_against,
  AVG(COALESCE(ps_for.transition_goals, 0))::numeric AS transition_goals_for,
  AVG(COALESCE(ps_against.transition_goals, 0))::numeric AS transition_goals_against,
  AVG(COALESCE(ps_for.transition_shots, 0))::numeric AS transition_shots_for,
  AVG(COALESCE(ps_against.transition_shots, 0))::numeric AS transition_shots_against,
  AVG(COALESCE(ps_for.transition_xt, 0))::numeric AS transition_xt_for,
  AVG(COALESCE(ps_against.transition_xt, 0))::numeric AS transition_xt_against,
  AVG(COALESCE(ps_for.transition_xg, 0))::numeric AS transition_xg_for,
  AVG(COALESCE(ps_against.transition_xg, 0))::numeric AS transition_xg_against,
  AVG(COALESCE(ps_for.set_piece_goals, 0))::numeric AS set_piece_goals_for,
  AVG(COALESCE(ps_against.set_piece_goals, 0))::numeric AS set_piece_goals_against,
  AVG(COALESCE(ps_for.set_piece_shots, 0))::numeric AS set_piece_shots_for,
  AVG(COALESCE(ps_against.set_piece_shots, 0))::numeric AS set_piece_shots_against,
  AVG(COALESCE(ps_for.set_piece_xt, 0))::numeric AS set_piece_xt_for,
  AVG(COALESCE(ps_against.set_piece_xt, 0))::numeric AS set_piece_xt_against,
  AVG(COALESCE(ps_for.set_piece_xg, 0))::numeric AS set_piece_xg_for,
  AVG(COALESCE(ps_against.set_piece_xg, 0))::numeric AS set_piece_xg_against,
  AVG(COALESCE(tms_for.team_match_possession, 0))::numeric * 100 AS possession_for,
  AVG(COALESCE(tms_against.team_match_possession, 0))::numeric * 100 AS possession_against,
  AVG(COALESCE(tms_for.team_match_successful_passes, 0))::numeric AS passes_for,
  AVG(COALESCE(tms_against.team_match_successful_passes, 0))::numeric AS passes_against,
  AVG(COALESCE(tms_for.team_match_ppda, 0))::numeric AS ppda_for,
  AVG(COALESCE(tms_against.team_match_ppda, 0))::numeric AS ppda_against
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
GROUP BY tm.team_id
ORDER BY team_name ASC
