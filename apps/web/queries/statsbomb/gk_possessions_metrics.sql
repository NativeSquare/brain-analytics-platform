WITH selected_competition AS (
    SELECT tm.competition_id
    FROM gold.team_matches tm
    WHERE tm.team_id = $2
      AND tm.season_id = $3
      AND tm.goals_scored IS NOT NULL
      AND tm.competition_stage_name = 'Regular Season'
    ORDER BY tm.match_date DESC
    LIMIT 1
),
league_matches_ids AS (
    SELECT tm.match_id
    FROM gold.team_matches tm
    JOIN selected_competition sc ON tm.competition_id = sc.competition_id
    WHERE tm.season_id = $3
      AND tm.competition_stage_name = 'Regular Season'
),
team_season_matches AS (
    SELECT DISTINCT match_id
    FROM gold.team_matches
    WHERE team_id = $2 
      AND match_id IN (SELECT match_id FROM league_matches_ids)
),
match_base AS (
    SELECT *
    FROM gold.possessions
    WHERE match_id = $1
      AND (possession_team_id = $2 OR out_of_possession_team_id = $2)
),
league_base AS (
    SELECT *
    FROM gold.possessions
    WHERE match_id IN (SELECT match_id FROM league_matches_ids)
),
match_enriched AS (
    SELECT
        match_id,
        CASE WHEN possession_team_id = $2 THEN 'team' ELSE 'opponent' END AS side,
        COALESCE(possession_type, '') AS possession_type,
        COALESCE(direct_long, 0) AS direct_long,
        COALESCE(short_then_long, 0) AS short_then_long,
        COALESCE(short, 0) AS short,
        COALESCE(retained, 0) AS retained,
        COALESCE(x_end, 0) AS x_end
    FROM match_base
),
league_all_enriched AS (
    SELECT
        match_id,
        possession_team_id AS team_id,
        'team' AS side,
        COALESCE(possession_type, '') AS possession_type,
        COALESCE(direct_long, 0) AS direct_long,
        COALESCE(short_then_long, 0) AS short_then_long,
        COALESCE(short, 0) AS short,
        COALESCE(retained, 0) AS retained,
        COALESCE(x_end, 0) AS x_end
    FROM league_base
    UNION ALL
    SELECT
        match_id,
        out_of_possession_team_id AS team_id,
        'opponent' AS side,
        COALESCE(possession_type, '') AS possession_type,
        COALESCE(direct_long, 0) AS direct_long,
        COALESCE(short_then_long, 0) AS short_then_long,
        COALESCE(short, 0) AS short,
        COALESCE(retained, 0) AS retained,
        COALESCE(x_end, 0) AS x_end
    FROM league_base
),
league_agg AS (
    SELECT
        match_id,
        team_id,
        side,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND direct_long > 0 THEN 1 ELSE 0 END) AS gk_long_count,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND direct_long > 0 AND retained > 0 THEN 1 ELSE 0 END) AS gk_long_retained,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND short_then_long > 0 THEN 1 ELSE 0 END) AS gk_short_then_long_count,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND short_then_long > 0 AND retained > 0 THEN 1 ELSE 0 END) AS gk_short_then_long_retained,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND short > 0 THEN 1 ELSE 0 END) AS gk_short_count,
        SUM(CASE WHEN possession_type = 'Goal Kick' AND short > 0 AND retained > 0 THEN 1 ELSE 0 END) AS gk_short_retained,
        SUM(CASE WHEN possession_type = 'GK Reset' THEN 1 ELSE 0 END) AS gk_reset_count,
        SUM(CASE WHEN possession_type = 'GK Reset' AND x_end >= 60 THEN 1 ELSE 0 END) AS gk_reset_into_opp_half
    FROM league_all_enriched
    GROUP BY match_id, team_id, side
),
league_calc AS (
    SELECT
        match_id, team_id, side, gk_long_count, gk_short_then_long_count, gk_short_count, gk_reset_count,
        CASE WHEN gk_long_count > 0 THEN gk_long_retained::float * 100 / gk_long_count END AS gk_long_retained_pct,
        CASE WHEN gk_short_then_long_count > 0 THEN gk_short_then_long_retained::float * 100 / gk_short_then_long_count END AS gk_short_then_long_retained_pct,
        CASE WHEN gk_short_count > 0 THEN gk_short_retained::float * 100 / gk_short_count END AS gk_short_retained_pct,
        CASE WHEN gk_reset_count > 0 THEN gk_reset_into_opp_half::float * 100 / gk_reset_count END AS gk_reset_into_opp_half_pct
    FROM league_agg
),
league_avg AS (
    SELECT
        team_id, side,
        AVG(gk_long_count) AS gk_long_count,
        AVG(gk_long_retained_pct) AS gk_long_retained_pct,
        AVG(gk_short_then_long_count) AS gk_short_then_long_count,
        AVG(gk_short_then_long_retained_pct) AS gk_short_then_long_retained_pct,
        AVG(gk_short_count) AS gk_short_count,
        AVG(gk_short_retained_pct) AS gk_short_retained_pct,
        AVG(gk_reset_count) AS gk_reset_count,
        AVG(gk_reset_into_opp_half_pct) AS gk_reset_into_opp_half_pct
    FROM league_calc
    GROUP BY team_id, side
),
league_rank AS (
    SELECT
        team_id, side,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_long_count END ASC, CASE WHEN side = 'team' THEN gk_long_count END DESC) AS gk_long_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_long_retained_pct END ASC, CASE WHEN side = 'team' THEN gk_long_retained_pct END DESC) AS gk_long_retained_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_short_then_long_count END ASC, CASE WHEN side = 'team' THEN gk_short_then_long_count END DESC) AS gk_short_then_long_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_short_then_long_retained_pct END ASC, CASE WHEN side = 'team' THEN gk_short_then_long_retained_pct END DESC) AS gk_short_then_long_retained_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_short_count END ASC, CASE WHEN side = 'team' THEN gk_short_count END DESC) AS gk_short_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_short_retained_pct END ASC, CASE WHEN side = 'team' THEN gk_short_retained_pct END DESC) AS gk_short_retained_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_reset_count END ASC, CASE WHEN side = 'team' THEN gk_reset_count END DESC) AS gk_reset_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN gk_reset_into_opp_half_pct END ASC, CASE WHEN side = 'team' THEN gk_reset_into_opp_half_pct END DESC) AS gk_reset_into_opp_half_pct_rank
    FROM league_avg
),
match_calc AS (
    SELECT
        'match' AS scope, side, gk_long_count, gk_short_then_long_count, gk_short_count, gk_reset_count,
        gk_long_retained_pct, gk_short_then_long_retained_pct, gk_short_retained_pct, gk_reset_into_opp_half_pct
    FROM league_calc
    WHERE match_id = $1 AND team_id = $2
),
season_avg_final AS (
    SELECT
        'season_avg' AS scope, side, gk_long_count, gk_short_then_long_count, gk_short_count, gk_reset_count,
        gk_long_retained_pct, gk_short_then_long_retained_pct, gk_short_retained_pct, gk_reset_into_opp_half_pct
    FROM league_avg
    WHERE team_id = $2
),
league_rank_team AS (
    SELECT * FROM league_rank WHERE team_id = $2
)
SELECT
    m.*,
    NULL::int AS gk_long_count_rank, NULL::int AS gk_long_retained_pct_rank, NULL::int AS gk_short_then_long_count_rank, NULL::int AS gk_short_then_long_retained_pct_rank,
    NULL::int AS gk_short_count_rank, NULL::int AS gk_short_retained_pct_rank, NULL::int AS gk_reset_count_rank, NULL::int AS gk_reset_into_opp_half_pct_rank
FROM match_calc m
UNION ALL
SELECT
    s.*,
    r.gk_long_count_rank, r.gk_long_retained_pct_rank, r.gk_short_then_long_count_rank, r.gk_short_then_long_retained_pct_rank,
    r.gk_short_count_rank, r.gk_short_retained_pct_rank, r.gk_reset_count_rank, r.gk_reset_into_opp_half_pct_rank
FROM season_avg_final s
LEFT JOIN league_rank_team r ON r.side = s.side
ORDER BY scope, side;
