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
    COALESCE(SUM(p.goal), 0)::numeric AS goals,
    COALESCE(SUM(p.successful_pass_non_shot_obv_for_net), 0)::numeric AS xt,
    COALESCE(SUM(p.total_xg), 0)::numeric AS total_xg,
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.phase, '')) = 'build-up' AND COALESCE(p.SP, 0) = 0 THEN p.total_xg ELSE 0 END), 0)::numeric AS build_up_xg,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'transition' OR COALESCE(p.transition, 0) = 1) THEN p.total_xg ELSE 0 END), 0)::numeric AS transition_xg,
    COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p.phase, '')) = 'set piece' OR COALESCE(p.SP, 0) = 1) THEN p.total_xg ELSE 0 END), 0)::numeric AS set_piece_xg,
    COALESCE(SUM(p.shot_count), 0)::numeric AS shots,
    COALESCE(AVG(tms.team_match_successful_passes), 0)::numeric AS passes,
    COALESCE(AVG(tms.team_match_possession), 0)::numeric * 100 AS possession,
    COALESCE(AVG(tms.team_match_ppda), 0)::numeric AS ppda
  FROM gold.possessions p
  LEFT JOIN silver.team_match_stats tms
    ON p.match_id = tms.match_id AND p.possession_team_id = tms.team_id
  WHERE p.match_id IN (SELECT match_id FROM league_matches_base)
  GROUP BY p.match_id, p.possession_team_id
),
match_stats AS (
  SELECT 
    tm.match_id,
    tm.team_id,
    tm.opponent_team_id,
    COALESCE(ps_for.goals, 0)::numeric as goals_for,
    COALESCE(ps_for.xt, 0)::numeric as xt_for,
    COALESCE(ps_for.total_xg, 0)::numeric as total_xg_for,
    COALESCE(ps_for.build_up_xg, 0)::numeric as build_up_xg_for,
    COALESCE(ps_for.transition_xg, 0)::numeric as transition_xg_for,
    COALESCE(ps_for.set_piece_xg, 0)::numeric as set_piece_xg_for,
    COALESCE(ps_for.shots, 0)::numeric as shots_for,
    COALESCE(ps_for.passes, 0)::numeric as passes_for,
    COALESCE(ps_for.possession, 0)::numeric as possession_for,
    COALESCE(ps_for.ppda, 0)::numeric as ppda_for
  FROM gold.team_matches tm
  LEFT JOIN possession_stats ps_for
    ON tm.match_id = ps_for.match_id AND tm.team_id = ps_for.team_id
  WHERE tm.match_id IN (SELECT match_id FROM league_matches_base)
),
opponent_stats AS (
  SELECT 
    tm.match_id,
    tm.team_id,
    tm.opponent_team_id,
    COALESCE(ps_against.goals, 0)::numeric as goals_against,
    COALESCE(ps_against.xt, 0)::numeric as xt_against,
    COALESCE(ps_against.total_xg, 0)::numeric as total_xg_against,
    COALESCE(ps_against.build_up_xg, 0)::numeric as build_up_xg_against,
    COALESCE(ps_against.transition_xg, 0)::numeric as transition_xg_against,
    COALESCE(ps_against.set_piece_xg, 0)::numeric as set_piece_xg_against,
    COALESCE(ps_against.shots, 0)::numeric as shots_against,
    COALESCE(ps_against.passes, 0)::numeric as passes_against,
    COALESCE(ps_against.possession, 0)::numeric as possession_against,
    COALESCE(ps_against.ppda, 0)::numeric as ppda_against
  FROM gold.team_matches tm
  LEFT JOIN possession_stats ps_against
    ON tm.match_id = ps_against.match_id AND tm.opponent_team_id = ps_against.team_id
  WHERE tm.match_id IN (SELECT match_id FROM league_matches_base)
),
all_team_averages AS (
  SELECT 
    ms.team_id,
    'goals' as stat_key,
    AVG(ms.goals_for)::numeric as avg_for,
    AVG(os.goals_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'xt' as stat_key,
    AVG(ms.xt_for)::numeric as avg_for,
    AVG(os.xt_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'total_xg' as stat_key,
    AVG(ms.total_xg_for)::numeric as avg_for,
    AVG(os.total_xg_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'build_up_xg' as stat_key,
    AVG(ms.build_up_xg_for)::numeric as avg_for,
    AVG(os.build_up_xg_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'transition_xg' as stat_key,
    AVG(ms.transition_xg_for)::numeric as avg_for,
    AVG(os.transition_xg_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'set_piece_xg' as stat_key,
    AVG(ms.set_piece_xg_for)::numeric as avg_for,
    AVG(os.set_piece_xg_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'shots' as stat_key,
    AVG(ms.shots_for)::numeric as avg_for,
    AVG(os.shots_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'passes' as stat_key,
    AVG(ms.passes_for)::numeric as avg_for,
    AVG(os.passes_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'possession' as stat_key,
    AVG(ms.possession_for)::numeric as avg_for,
    AVG(os.possession_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
  UNION ALL
  SELECT 
    ms.team_id,
    'ppda' as stat_key,
    AVG(ms.ppda_for)::numeric as avg_for,
    AVG(os.ppda_against)::numeric as avg_against
  FROM match_stats ms
  JOIN opponent_stats os ON ms.match_id = os.match_id AND ms.team_id = os.team_id
  GROUP BY ms.team_id
)
SELECT team_id, stat_key, avg_for, avg_against
FROM all_team_averages
WHERE team_id = $1
