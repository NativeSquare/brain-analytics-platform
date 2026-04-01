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
        COALESCE(build_up, 0) AS build_up_flag,
        COALESCE(SP, 0) AS set_piece_flag,
        COALESCE(duration_seconds, 0) AS duration_seconds,
        COALESCE(goal, 0) AS goal,
        COALESCE(penalty_scored, 0) AS penalty_scored,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(mid_third_progression, 0) AS mid_third_progression,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(penalty_area_progression, 0) AS penalty_area_progression,
        COALESCE(x_end, 0) AS x_end,
        success,
        retained
    FROM season_base
),
match_agg AS (
    SELECT
        match_id,
        team_id,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN duration_seconds ELSE 0 END) AS bu_minutes,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN goal ELSE 0 END) AS bu_goals,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN shot_count ELSE 0 END) AS bu_shots,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN total_xg ELSE 0 END) AS bu_xg,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN xt ELSE 0 END) AS bu_xt,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_possessions,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'def%' AND mid_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_into_mid,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'def%' AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_into_final,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN xt ELSE 0 END) AS def_third_xt,
        SUM(CASE
            WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS def_third_lost,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS mid_third_possessions,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'mid%' AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS mid_third_into_final,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN xt ELSE 0 END) AS mid_third_xt,
        SUM(CASE
            WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS mid_third_lost,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND x_end >= 60 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS regained_atk_half,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS bu_possessions,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_entries,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND penalty_area_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_into_box,
        SUM(CASE WHEN (phase_norm IN ('build-up', 'build up', 'buildup') OR build_up_flag = 1) AND shot_count > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_shot
    FROM enriched
    GROUP BY match_id, team_id
),
match_calc AS (
    SELECT
        match_id,
        team_id,
        bu_minutes,
        bu_goals,
        bu_shots,
        bu_xg,
        bu_xt,
        def_third_possessions,
        CASE WHEN def_third_possessions > 0 THEN def_third_into_mid::float * 100 / def_third_possessions END AS def_third_into_mid_pct,
        CASE WHEN def_third_possessions > 0 THEN def_third_into_final::float * 100 / def_third_possessions END AS def_third_into_final_pct,
        def_third_xt,
        CASE WHEN def_third_possessions > 0 THEN def_third_lost::float * 100 / def_third_possessions END AS def_third_lost_pct,
        mid_third_possessions,
        CASE WHEN mid_third_possessions > 0 THEN mid_third_into_final::float * 100 / mid_third_possessions END AS mid_third_into_final_pct,
        mid_third_xt,
        CASE WHEN mid_third_possessions > 0 THEN mid_third_lost::float * 100 / mid_third_possessions END AS mid_third_lost_pct,
        CASE WHEN bu_possessions > 0 THEN regained_atk_half::float * 100 / bu_possessions END AS regained_atk_half_pct,
        final_third_entries,
        CASE WHEN final_third_entries > 0 THEN final_third_into_box::float * 100 / final_third_entries END AS final_third_into_box_pct,
        CASE WHEN final_third_entries > 0 THEN final_third_shot::float * 100 / final_third_entries END AS final_third_shot_pct,
        CASE WHEN final_third_entries > 0 THEN bu_xg::float / final_third_entries END AS xg_per_entry
    FROM match_agg
),
season_avg AS (
    SELECT
        team_id,
        AVG(bu_minutes) AS bu_minutes,
        AVG(bu_goals) AS bu_goals,
        AVG(bu_shots) AS bu_shots,
        AVG(bu_xg) AS bu_xg,
        AVG(bu_xt) AS bu_xt,
        AVG(def_third_possessions) AS def_third_possessions,
        AVG(def_third_into_mid_pct) AS def_third_into_mid_pct,
        AVG(def_third_into_final_pct) AS def_third_into_final_pct,
        AVG(def_third_xt) AS def_third_xt,
        AVG(def_third_lost_pct) AS def_third_lost_pct,
        AVG(mid_third_possessions) AS mid_third_possessions,
        AVG(mid_third_into_final_pct) AS mid_third_into_final_pct,
        AVG(mid_third_xt) AS mid_third_xt,
        AVG(mid_third_lost_pct) AS mid_third_lost_pct,
        AVG(regained_atk_half_pct) AS regained_atk_half_pct,
        AVG(final_third_entries) AS final_third_entries,
        AVG(final_third_into_box_pct) AS final_third_into_box_pct,
        AVG(final_third_shot_pct) AS final_third_shot_pct,
        AVG(xg_per_entry) AS xg_per_entry
    FROM match_calc
    GROUP BY team_id
),
league_rank AS (
    SELECT
        team_id,
        RANK() OVER (ORDER BY bu_minutes DESC) AS bu_minutes_rank,
        RANK() OVER (ORDER BY bu_goals DESC) AS bu_goals_rank,
        RANK() OVER (ORDER BY bu_shots DESC) AS bu_shots_rank,
        RANK() OVER (ORDER BY bu_xg DESC) AS bu_xg_rank,
        RANK() OVER (ORDER BY bu_xt DESC) AS bu_xt_rank,
        RANK() OVER (ORDER BY def_third_possessions DESC) AS def_third_possessions_rank,
        RANK() OVER (ORDER BY def_third_into_mid_pct DESC) AS def_third_into_mid_pct_rank,
        RANK() OVER (ORDER BY def_third_into_final_pct DESC) AS def_third_into_final_pct_rank,
        RANK() OVER (ORDER BY def_third_xt DESC) AS def_third_xt_rank,
        RANK() OVER (ORDER BY def_third_lost_pct DESC) AS def_third_lost_pct_rank,
        RANK() OVER (ORDER BY mid_third_possessions DESC) AS mid_third_possessions_rank,
        RANK() OVER (ORDER BY mid_third_into_final_pct DESC) AS mid_third_into_final_pct_rank,
        RANK() OVER (ORDER BY mid_third_xt DESC) AS mid_third_xt_rank,
        RANK() OVER (ORDER BY mid_third_lost_pct DESC) AS mid_third_lost_pct_rank,
        RANK() OVER (ORDER BY regained_atk_half_pct DESC) AS regained_atk_half_pct_rank,
        RANK() OVER (ORDER BY final_third_entries DESC) AS final_third_entries_rank,
        RANK() OVER (ORDER BY final_third_into_box_pct DESC) AS final_third_into_box_pct_rank,
        RANK() OVER (ORDER BY final_third_shot_pct DESC) AS final_third_shot_pct_rank,
        RANK() OVER (ORDER BY xg_per_entry DESC) AS xg_per_entry_rank,
        COUNT(*) OVER () as total_teams
    FROM season_avg
)
SELECT
    s.*,
    r.bu_minutes_rank,
    r.bu_goals_rank,
    r.bu_shots_rank,
    r.bu_xg_rank,
    r.bu_xt_rank,
    r.def_third_possessions_rank,
    r.def_third_into_mid_pct_rank,
    r.def_third_into_final_pct_rank,
    r.def_third_xt_rank,
    r.def_third_lost_pct_rank,
    r.mid_third_possessions_rank,
    r.mid_third_into_final_pct_rank,
    r.mid_third_xt_rank,
    r.mid_third_lost_pct_rank,
    r.regained_atk_half_pct_rank,
    r.final_third_entries_rank,
    r.final_third_into_box_pct_rank,
    r.final_third_shot_pct_rank,
    r.xg_per_entry_rank,
    r.total_teams
FROM season_avg s
JOIN league_rank r USING (team_id)
WHERE s.team_id = $2
