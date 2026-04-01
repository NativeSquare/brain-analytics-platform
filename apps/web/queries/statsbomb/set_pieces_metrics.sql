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
season_matches AS (
    SELECT match_id, home_team_id, away_team_id
    FROM silver.matches
    WHERE match_id IN (SELECT match_id FROM league_matches_ids)
),
match_base AS (
    SELECT 
        sp.set_piece_id,
        sp.start_event_id,
        sp.end_event_id,
        sp.match_id,
        sp.team_id,
        sp.period,
        sp.timestamp,
        sp.sp_type,
        sp.sp_zone,
        sp.side,
        sp.taker_id,
        sp.technique,
        sp.shot_event_ids,
        sp.delivered_first_phase,
        sp.is_short,
        sp.is_long_throw,
        sp.is_direct_sp,
        sp.target,
        sp.first_contact_won,
        sp.second_ball_won,
        sp.shots,
        CASE 
            WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.total_xg, 0)
            ELSE 0
        END AS xg,
        sp.delivered_first_phase_player_id,
        sp.delivered_first_phase_event_id,
        sp.first_phase_first_contact_player_id,
        sp.first_phase_first_contact_event_id,
        sp.first_phase_first_contact_x,
        sp.first_phase_first_contact_y,
        sp.first_phase_first_contact_team_id,
        sp.second_ball_player_id,
        sp.second_ball_event_id,
        sp.second_ball_x,
        sp.second_ball_y,
        sm.home_team_id,
        sm.away_team_id,
        CASE 
            WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.goal, 0)
            ELSE 0
        END AS goal
    FROM gold.set_pieces sp
    JOIN season_matches sm ON sm.match_id = sp.match_id
    LEFT JOIN gold.possessions p ON p.start_event_id = sp.start_event_id
    WHERE sp.match_id = $1
      AND sp.team_id IS NOT NULL
      AND sp_type != 'Penalty'
),
league_base AS (
    SELECT 
        sp.set_piece_id,
        sp.start_event_id,
        sp.end_event_id,
        sp.match_id,
        sp.team_id,
        sp.period,
        sp.timestamp,
        sp.sp_type,
        sp.sp_zone,
        sp.side,
        sp.taker_id,
        sp.technique,
        sp.shot_event_ids,
        sp.delivered_first_phase,
        sp.is_short,
        sp.is_long_throw,
        sp.is_direct_sp,
        sp.target,
        sp.first_contact_won,
        sp.second_ball_won,
        sp.shots,
        CASE 
            WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.total_xg, 0)
            ELSE 0
        END AS xg,
        sp.delivered_first_phase_player_id,
        sp.delivered_first_phase_event_id,
        sp.first_phase_first_contact_player_id,
        sp.first_phase_first_contact_event_id,
        sp.first_phase_first_contact_x,
        sp.first_phase_first_contact_y,
        sp.first_phase_first_contact_team_id,
        sp.second_ball_player_id,
        sp.second_ball_event_id,
        sp.second_ball_x,
        sp.second_ball_y,
        sm.home_team_id,
        sm.away_team_id,
        CASE 
            WHEN p.possession_team_id = sp.team_id THEN COALESCE(p.goal, 0)
            ELSE 0
        END AS goal
    FROM gold.set_pieces sp
    JOIN season_matches sm ON sm.match_id = sp.match_id
    LEFT JOIN gold.possessions p ON p.start_event_id = sp.start_event_id
    WHERE sp.team_id IS NOT NULL
      AND sp_type != 'Penalty'
),
match_enriched AS (
    SELECT
        match_id,
        CASE WHEN team_id = $2 THEN 'team' ELSE 'opponent' END AS side,
        NULLIF(LOWER(COALESCE(sp_type, '')), '') AS sp_type,
        COALESCE(goal, 0) AS goal,
        COALESCE(xg, 0) AS xg,
        COALESCE(shots, 0) AS shots,
        COALESCE(first_contact_won, FALSE) AS first_contact_won
    FROM match_base
),
league_all_enriched AS (
    SELECT
        match_id,
        team_id AS team_id,
        'team' AS side,
        NULLIF(LOWER(COALESCE(sp_type, '')), '') AS sp_type,
        COALESCE(goal, 0) AS goal,
        COALESCE(xg, 0) AS xg,
        COALESCE(shots, 0) AS shots,
        COALESCE(first_contact_won, FALSE) AS first_contact_won
    FROM league_base
    UNION ALL
    SELECT
        match_id,
        CASE
            WHEN team_id = home_team_id THEN away_team_id
            WHEN team_id = away_team_id THEN home_team_id
            ELSE NULL
        END AS team_id,
        'opponent' AS side,
        NULLIF(LOWER(COALESCE(sp_type, '')), '') AS sp_type,
        COALESCE(goal, 0) AS goal,
        COALESCE(xg, 0) AS xg,
        COALESCE(shots, 0) AS shots,
        COALESCE(first_contact_won, FALSE) AS first_contact_won
    FROM league_base
),
match_agg AS (
    SELECT
        side,
        sp_type,
        COUNT(*) AS sp_count,
        SUM(goal) AS goals,
        SUM(xg) AS xg,
        SUM(CASE WHEN shots > 0 THEN 1 ELSE 0 END) AS shots_count,
        SUM(CASE WHEN first_contact_won THEN 1 ELSE 0 END) AS first_contacts
    FROM match_enriched
    GROUP BY GROUPING SETS ((side, sp_type), (side))
),
match_calc AS (
    SELECT
        'match' AS scope,
        side,
        sp_type,
        sp_count,
        goals,
        xg,
        CASE WHEN sp_count > 0 THEN xg::float / sp_count END AS xg_per_sp,
        CASE WHEN sp_count > 0 THEN shots_count::float * 100 / sp_count END AS shot_pct,
        CASE WHEN sp_count > 0 THEN first_contacts::float * 100 / sp_count END AS first_contact_pct
    FROM match_agg
),
league_agg AS (
    SELECT
        match_id,
        team_id,
        side,
        sp_type,
        COUNT(*) AS sp_count,
        SUM(goal) AS goals,
        SUM(xg) AS xg,
        SUM(CASE WHEN shots > 0 THEN 1 ELSE 0 END) AS shots_count,
        SUM(CASE WHEN first_contact_won THEN 1 ELSE 0 END) AS first_contacts
    FROM league_all_enriched
    WHERE team_id IS NOT NULL
    GROUP BY GROUPING SETS ((match_id, team_id, side, sp_type), (match_id, team_id, side))
),
league_calc AS (
    SELECT
        match_id,
        team_id,
        side,
        sp_type,
        sp_count,
        goals,
        xg,
        CASE WHEN sp_count > 0 THEN xg::float / sp_count END AS xg_per_sp,
        CASE WHEN sp_count > 0 THEN shots_count::float * 100 / sp_count END AS shot_pct,
        CASE WHEN sp_count > 0 THEN first_contacts::float * 100 / sp_count END AS first_contact_pct
    FROM league_agg
),
league_avg AS (
    SELECT
        team_id,
        side,
        sp_type,
        AVG(sp_count) AS sp_count,
        AVG(goals) AS goals,
        AVG(xg) AS xg,
        AVG(xg_per_sp) AS xg_per_sp,
        AVG(shot_pct) AS shot_pct,
        AVG(first_contact_pct) AS first_contact_pct
    FROM league_calc
    GROUP BY team_id, side, sp_type
),
league_rank AS (
    SELECT
        team_id,
        side,
        sp_type,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN sp_count END ASC,
            CASE WHEN side = 'team' THEN sp_count END DESC
        ) AS sp_count_rank,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN goals END ASC,
            CASE WHEN side = 'team' THEN goals END DESC
        ) AS goals_rank,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN xg END ASC,
            CASE WHEN side = 'team' THEN xg END DESC
        ) AS xg_rank,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN xg_per_sp END ASC,
            CASE WHEN side = 'team' THEN xg_per_sp END DESC
        ) AS xg_per_sp_rank,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN shot_pct END ASC,
            CASE WHEN side = 'team' THEN shot_pct END DESC
        ) AS shot_pct_rank,
        RANK() OVER (PARTITION BY side, sp_type ORDER BY
            CASE WHEN side = 'opponent' THEN first_contact_pct END ASC,
            CASE WHEN side = 'team' THEN first_contact_pct END DESC
        ) AS first_contact_pct_rank
    FROM league_avg
),
season_avg_final AS (
    SELECT
        'season_avg' AS scope,
        side,
        sp_type,
        sp_count,
        goals,
        xg,
        xg_per_sp,
        shot_pct,
        first_contact_pct
    FROM league_avg
    WHERE team_id = $2
),
league_rank_team AS (
    SELECT * FROM league_rank WHERE team_id = $2
)
SELECT
    scope,
    side,
    sp_type,
    sp_count,
    goals,
    xg,
    xg_per_sp,
    shot_pct,
    first_contact_pct,
    NULL::int AS sp_count_rank,
    NULL::int AS goals_rank,
    NULL::int AS xg_rank,
    NULL::int AS xg_per_sp_rank,
    NULL::int AS shot_pct_rank,
    NULL::int AS first_contact_pct_rank
FROM match_calc
UNION ALL
SELECT
    s.scope,
    s.side,
    s.sp_type,
    s.sp_count,
    s.goals,
    s.xg,
    s.xg_per_sp,
    s.shot_pct,
    s.first_contact_pct,
    r.sp_count_rank,
    r.goals_rank,
    r.xg_rank,
    r.xg_per_sp_rank,
    r.shot_pct_rank,
    r.first_contact_pct_rank
FROM season_avg_final s
LEFT JOIN league_rank_team r
    ON r.side = s.side
    AND (r.sp_type = s.sp_type OR (r.sp_type IS NULL AND s.sp_type IS NULL))
ORDER BY scope, side, sp_type;
