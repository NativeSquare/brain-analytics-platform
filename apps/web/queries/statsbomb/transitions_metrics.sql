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
        LOWER(COALESCE(phase, '')) AS phase_norm,
        LOWER(COALESCE(third, '')) AS third_norm,
        COALESCE(transition, 0) AS transition_flag,
        COALESCE(regain, 0) AS regain_flag,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(success, NULL) AS success,
        COALESCE(retained, NULL) AS retained,
        COALESCE(goal, 0) AS goal,
        COALESCE(penalty_scored, 0) AS penalty_scored,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(x_start, 0) AS x_start
    FROM match_base
),
league_all_enriched AS (
    SELECT
        match_id,
        possession_team_id AS team_id,
        'team' AS side,
        LOWER(COALESCE(phase, '')) AS phase_norm,
        LOWER(COALESCE(third, '')) AS third_norm,
        COALESCE(transition, 0) AS transition_flag,
        COALESCE(regain, 0) AS regain_flag,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(success, NULL) AS success,
        COALESCE(retained, NULL) AS retained,
        COALESCE(goal, 0) AS goal,
        COALESCE(penalty_scored, 0) AS penalty_scored,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(x_start, 0) AS x_start
    FROM league_base
    UNION ALL
    SELECT
        match_id,
        out_of_possession_team_id AS team_id,
        'opponent' AS side,
        LOWER(COALESCE(phase, '')) AS phase_norm,
        LOWER(COALESCE(third, '')) AS third_norm,
        COALESCE(transition, 0) AS transition_flag,
        COALESCE(regain, 0) AS regain_flag,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(success, NULL) AS success,
        COALESCE(retained, NULL) AS retained,
        COALESCE(goal, 0) AS goal,
        COALESCE(penalty_scored, 0) AS penalty_scored,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(x_start, 0) AS x_start
    FROM league_base
),
league_agg AS (
    SELECT
        match_id,
        team_id,
        side,
        SUM(CASE WHEN regain_flag > 0 THEN 1 ELSE 0 END) AS regains_count,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN 1 ELSE 0 END) AS transitions_count,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN goal ELSE 0 END) AS transition_goals,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN shot_count ELSE 0 END) AS transition_shots,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN total_xg ELSE 0 END) AS transition_xg,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN xt ELSE 0 END) AS transition_xt,
        SUM(CASE WHEN regain_flag > 0 AND x_start >= 60 THEN 1 ELSE 0 END) AS atk_half_regains,
        SUM(CASE
            WHEN third_norm LIKE 'def%' THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS def_half_turnovers,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) AND att_third_progression > 0 THEN 1 ELSE 0 END) AS transition_entries,
        SUM(CASE
            WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS transition_turnovers,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) AND regain_flag > 0 THEN 1 ELSE 0 END) AS transition_regains
    FROM league_all_enriched
    GROUP BY match_id, team_id, side
),
league_calc AS (
    SELECT
        match_id, team_id, side, regains_count, transitions_count, transition_goals, transition_shots, transition_xg, transition_xt, atk_half_regains, def_half_turnovers,
        CASE WHEN transitions_count > 0 THEN transition_entries::float * 100 / transitions_count END AS transition_entries_pct,
        CASE WHEN transitions_count > 0 THEN transition_turnovers::float * 100 / transitions_count END AS transition_turnover_pct,
        CASE WHEN transitions_count > 0 THEN (transitions_count - transition_turnovers)::float * 100 / transitions_count END AS transition_regain_pct,
        CASE WHEN transition_entries > 0 THEN transition_xg::float / transition_entries END AS transition_xg_per_entry
    FROM league_agg
),
league_avg AS (
    SELECT
        team_id, side,
        AVG(regains_count) AS regains_count,
        AVG(transitions_count) AS transitions_count,
        AVG(transition_goals) AS transition_goals,
        AVG(transition_shots) AS transition_shots,
        AVG(transition_xg) AS transition_xg,
        AVG(transition_xt) AS transition_xt,
        AVG(atk_half_regains) AS atk_half_regains,
        AVG(def_half_turnovers) AS def_half_turnovers,
        AVG(transition_entries_pct) AS transition_entries_pct,
        AVG(transition_turnover_pct) AS transition_turnover_pct,
        AVG(transition_regain_pct) AS transition_regain_pct,
        AVG(transition_xg_per_entry) AS transition_xg_per_entry
    FROM league_calc
    GROUP BY team_id, side
),
league_rank AS (
    SELECT
        team_id, side,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN regains_count END ASC, CASE WHEN side = 'team' THEN regains_count END DESC) AS regains_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transitions_count END ASC, CASE WHEN side = 'team' THEN transitions_count END DESC) AS transitions_count_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_goals END ASC, CASE WHEN side = 'team' THEN transition_goals END DESC) AS transition_goals_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_shots END ASC, CASE WHEN side = 'team' THEN transition_shots END DESC) AS transition_shots_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_xg END ASC, CASE WHEN side = 'team' THEN transition_xg END DESC) AS transition_xg_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_xt END ASC, CASE WHEN side = 'team' THEN transition_xt END DESC) AS transition_xt_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN atk_half_regains END ASC, CASE WHEN side = 'team' THEN atk_half_regains END DESC) AS atk_half_regains_rank,
        RANK() OVER (PARTITION BY side ORDER BY def_half_turnovers ASC) AS def_half_turnovers_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_entries_pct END ASC, CASE WHEN side = 'team' THEN transition_entries_pct END DESC) AS transition_entries_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY transition_turnover_pct ASC) AS transition_turnover_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY transition_regain_pct ASC) AS transition_regain_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN transition_xg_per_entry END ASC, CASE WHEN side = 'team' THEN transition_xg_per_entry END DESC) AS transition_xg_per_entry_rank
    FROM league_avg
),
ppda_league AS (
    SELECT
        team_id,
        side,
        AVG(ppda) AS ppda
    FROM (
        SELECT
            match_id,
            team_id,
            'team' AS side,
            team_match_ppda AS ppda
        FROM silver.team_match_stats
        WHERE match_id IN (SELECT match_id FROM league_matches_ids)

        UNION ALL

        SELECT
            match_id,
            opposition_id as team_id,
            'opponent' AS side,
            team_match_ppda AS ppda
        FROM silver.team_match_stats
        WHERE match_id IN (SELECT match_id FROM league_matches_ids)
    ) s
    GROUP BY team_id, side
),
ppda_rank AS (
    SELECT
        team_id,
        side,
        RANK() OVER (PARTITION BY side ORDER BY ppda ASC) AS ppda_rank
    FROM ppda_league
),
match_calc AS (
    SELECT
        'match' AS scope, side, regains_count, transitions_count, transition_goals, transition_shots, transition_xg, transition_xt,
        atk_half_regains, def_half_turnovers, transition_entries_pct, transition_turnover_pct, transition_regain_pct, transition_xg_per_entry
    FROM league_calc
    WHERE match_id = $1 AND team_id = $2
),
match_team_stats AS (
    SELECT
        'match' AS scope,
        CASE WHEN team_id = $2 THEN 'team' ELSE 'opponent' END AS side,
        team_match_ppda AS ppda
    FROM silver.team_match_stats
    WHERE match_id = $1
      AND (team_id = $2 OR opposition_id = $2)
),
season_team_stats AS (
    SELECT
        CASE WHEN team_id = $2 THEN 'team' ELSE 'opponent' END AS side,
        AVG(team_match_ppda) AS ppda
    FROM silver.team_match_stats
    WHERE match_id IN (SELECT match_id FROM team_season_matches)
      AND (team_id = $2 OR opposition_id = $2)
    GROUP BY side
),
season_avg_final AS (
    SELECT
        'season_avg' AS scope, side, regains_count, transitions_count, transition_goals, transition_shots, transition_xg, transition_xt,
        atk_half_regains, def_half_turnovers, transition_entries_pct, transition_turnover_pct, transition_regain_pct, transition_xg_per_entry
    FROM league_avg
    WHERE team_id = $2
),
league_rank_team AS (
    SELECT * FROM league_rank WHERE team_id = $2
),
ppda_rank_team AS (
    SELECT * FROM ppda_rank WHERE team_id = $2
),
combined_match AS (
    SELECT
        m.scope,
        m.side,
        m.regains_count,
        m.transitions_count,
        m.transition_goals,
        m.transition_shots,
        m.transition_xg,
        m.transition_xt,
        m.atk_half_regains,
        m.def_half_turnovers,
        mts.ppda,
        m.transition_entries_pct,
        m.transition_turnover_pct,
        m.transition_regain_pct,
        m.transition_xg_per_entry
    FROM match_calc m
    LEFT JOIN match_team_stats mts
        ON mts.scope = m.scope AND mts.side = m.side
),
combined_season AS (
    SELECT
        s.scope,
        s.side,
        s.regains_count,
        s.transitions_count,
        s.transition_goals,
        s.transition_shots,
        s.transition_xg,
        s.transition_xt,
        s.atk_half_regains,
        s.def_half_turnovers,
        sts.ppda,
        s.transition_entries_pct,
        s.transition_turnover_pct,
        s.transition_regain_pct,
        s.transition_xg_per_entry
    FROM season_avg_final s
    LEFT JOIN season_team_stats sts
        ON sts.side = s.side
)
SELECT
    scope,
    side,
    regains_count,
    transitions_count,
    transition_goals,
    transition_shots,
    transition_xg,
    transition_xt,
    atk_half_regains,
    def_half_turnovers,
    ppda,
    transition_entries_pct,
    transition_turnover_pct,
    transition_regain_pct,
    transition_xg_per_entry,
    NULL::int AS regains_count_rank,
    NULL::int AS transitions_count_rank,
    NULL::int AS transition_goals_rank,
    NULL::int AS transition_shots_rank,
    NULL::int AS transition_xg_rank,
    NULL::int AS transition_xt_rank,
    NULL::int AS atk_half_regains_rank,
    NULL::int AS def_half_turnovers_rank,
    NULL::int AS ppda_rank,
    NULL::int AS transition_entries_pct_rank,
    NULL::int AS transition_turnover_pct_rank,
    NULL::int AS transition_regain_pct_rank,
    NULL::int AS transition_xg_per_entry_rank
FROM combined_match
UNION ALL
SELECT
    s.scope,
    s.side,
    s.regains_count,
    s.transitions_count,
    s.transition_goals,
    s.transition_shots,
    s.transition_xg,
    s.transition_xt,
    s.atk_half_regains,
    s.def_half_turnovers,
    s.ppda,
    s.transition_entries_pct,
    s.transition_turnover_pct,
    s.transition_regain_pct,
    s.transition_xg_per_entry,
    r.regains_count_rank,
    r.transitions_count_rank,
    r.transition_goals_rank,
    r.transition_shots_rank,
    r.transition_xg_rank,
    r.transition_xt_rank,
    r.atk_half_regains_rank,
    r.def_half_turnovers_rank,
    pr.ppda_rank,
    r.transition_entries_pct_rank,
    r.transition_turnover_pct_rank,
    r.transition_regain_pct_rank,
    r.transition_xg_per_entry_rank
FROM combined_season s
LEFT JOIN league_rank_team r ON r.side = s.side
LEFT JOIN ppda_rank_team pr ON pr.side = s.side
ORDER BY scope, side;
