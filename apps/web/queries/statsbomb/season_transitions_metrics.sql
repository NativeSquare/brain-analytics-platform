WITH season_matches AS (
    SELECT DISTINCT match_id
    FROM gold.team_matches
    WHERE season_id = $1 AND competition_id = $3
),
season_base AS (
    SELECT *
    FROM gold.possessions
    WHERE match_id IN (SELECT match_id FROM season_matches)
),
enriched AS (
    SELECT
        match_id,
        possession_team_id AS team_id,
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
    FROM season_base
),
match_agg AS (
    SELECT
        match_id,
        team_id,
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
                    WHEN success IS NOT NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NOT NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            ELSE 0
        END) AS def_half_turnovers,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) AND att_third_progression > 0 THEN 1 ELSE 0 END) AS transition_entries,
        SUM(CASE
            WHEN (phase_norm = 'transition' OR transition_flag = 1) THEN
                CASE
                    WHEN success IS NOT NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NOT NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            ELSE 0
        END) AS transition_turnovers,
        SUM(CASE WHEN (phase_norm = 'transition' OR transition_flag = 1) AND regain_flag > 0 THEN 1 ELSE 0 END) AS transition_regains
    FROM enriched
    GROUP BY match_id, team_id
),
match_calc AS (
    SELECT
        match_id,
        team_id,
        regains_count,
        transitions_count,
        transition_goals,
        transition_shots,
        transition_xg,
        transition_xt,
        atk_half_regains,
        def_half_turnovers,
        CASE WHEN transitions_count > 0 THEN transition_entries::float * 100 / transitions_count END AS transition_entries_pct,
        CASE WHEN transitions_count > 0 THEN transition_turnovers::float * 100 / transitions_count END AS transition_turnover_pct,
        CASE WHEN transitions_count > 0 THEN transition_regains::float * 100 / transitions_count END AS transition_regain_pct,
        CASE WHEN transition_entries > 0 THEN transition_xg::float / transition_entries END AS transition_xg_per_entry
    FROM match_agg
),
season_avg AS (
    SELECT
        team_id,
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
    FROM match_calc
    GROUP BY team_id
),
ppda_league AS (
    SELECT
        team_id,
        AVG(team_match_ppda) AS ppda
    FROM silver.team_match_stats
    WHERE match_id IN (SELECT match_id FROM season_matches)
    GROUP BY team_id
),
league_rank AS (
    SELECT
        team_id,
        RANK() OVER (ORDER BY regains_count DESC) AS regains_count_rank,
        RANK() OVER (ORDER BY transitions_count DESC) AS transitions_count_rank,
        RANK() OVER (ORDER BY transition_goals DESC) AS transition_goals_rank,
        RANK() OVER (ORDER BY transition_shots DESC) AS transition_shots_rank,
        RANK() OVER (ORDER BY transition_xg DESC) AS transition_xg_rank,
        RANK() OVER (ORDER BY transition_xt DESC) AS transition_xt_rank,
        RANK() OVER (ORDER BY atk_half_regains DESC) AS atk_half_regains_rank,
        RANK() OVER (ORDER BY def_half_turnovers ASC) AS def_half_turnovers_rank,
        RANK() OVER (ORDER BY transition_entries_pct DESC) AS transition_entries_pct_rank,
        RANK() OVER (ORDER BY transition_turnover_pct ASC) AS transition_turnover_pct_rank,
        RANK() OVER (ORDER BY transition_regain_pct ASC) AS transition_regain_pct_rank,
        RANK() OVER (ORDER BY transition_xg_per_entry DESC) AS transition_xg_per_entry_rank,
        COUNT(*) OVER () as total_teams
    FROM season_avg
),
ppda_rank AS (
    SELECT
        team_id,
        ppda,
        RANK() OVER (ORDER BY ppda ASC) AS ppda_rank,
        COUNT(*) OVER () as total_teams
    FROM ppda_league
)
SELECT
    s.*,
    p.ppda,
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
    r.transition_xg_per_entry_rank,
    r.total_teams
FROM season_avg s
JOIN league_rank r USING (team_id)
LEFT JOIN ppda_rank pr USING (team_id)
LEFT JOIN ppda_league p USING (team_id)
WHERE s.team_id = $2
