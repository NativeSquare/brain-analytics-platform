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
        COALESCE(SP, 0) AS set_piece_flag,
        COALESCE(duration_seconds, 0) AS duration_seconds,
        COALESCE(goal, 0) AS goal,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(mid_third_progression, 0) AS mid_third_progression,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(penalty_area_progression, 0) AS penalty_area_progression,
        COALESCE(x_end, 0) AS x_end,
        success,
        retained
    FROM match_base
),
league_all_enriched AS (
    SELECT
        match_id,
        possession_team_id AS team_id,
        'team' AS side,
        LOWER(COALESCE(phase, '')) AS phase_norm,
        LOWER(COALESCE(third, '')) AS third_norm,
        COALESCE(SP, 0) AS set_piece_flag,
        COALESCE(duration_seconds, 0) AS duration_seconds,
        COALESCE(goal, 0) AS goal,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(mid_third_progression, 0) AS mid_third_progression,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(penalty_area_progression, 0) AS penalty_area_progression,
        COALESCE(x_end, 0) AS x_end,
        success,
        retained
    FROM league_base
    UNION ALL
    SELECT
        match_id,
        out_of_possession_team_id AS team_id,
        'opponent' AS side,
        LOWER(COALESCE(phase, '')) AS phase_norm,
        LOWER(COALESCE(third, '')) AS third_norm,
        COALESCE(SP, 0) AS set_piece_flag,
        COALESCE(duration_seconds, 0) AS duration_seconds,
        COALESCE(goal, 0) AS goal,
        COALESCE(shot_count, 0) AS shot_count,
        COALESCE(total_xg, 0) AS total_xg,
        COALESCE(successful_pass_non_shot_obv_for_net, 0) AS xt,
        COALESCE(mid_third_progression, 0) AS mid_third_progression,
        COALESCE(att_third_progression, 0) AS att_third_progression,
        COALESCE(penalty_area_progression, 0) AS penalty_area_progression,
        COALESCE(x_end, 0) AS x_end,
        success,
        retained
    FROM league_base
),
league_agg AS (
    SELECT
        match_id,
        team_id,
        side,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN duration_seconds ELSE 0 END) AS bu_minutes,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN goal ELSE 0 END) AS bu_goals,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN shot_count ELSE 0 END) AS bu_shots,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN total_xg ELSE 0 END) AS bu_xg,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN xt ELSE 0 END) AS bu_xt,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_possessions,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'def%' AND mid_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_into_mid,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'def%' AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS def_third_into_final,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN xt ELSE 0 END) AS def_third_xt,
        SUM(CASE
            WHEN phase_norm = 'build-up' AND third_norm LIKE 'def%' AND set_piece_flag = 0 THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS def_third_lost,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS mid_third_possessions,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'mid%' AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS mid_third_into_final,
        SUM(CASE WHEN phase_norm = 'build-up' AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN xt ELSE 0 END) AS mid_third_xt,
        SUM(CASE
            WHEN phase_norm = 'build-up' AND third_norm LIKE 'mid%' AND set_piece_flag = 0 THEN
                CASE
                    WHEN success IS NULL AND retained IS NULL THEN 0
                    WHEN success IS NULL THEN CASE WHEN retained = 0 THEN 1 ELSE 0 END
                    WHEN retained IS NULL THEN CASE WHEN success = 0 THEN 1 ELSE 0 END
                    WHEN success = 0 AND retained = 0 THEN 1
                    ELSE 0
                END
            ELSE 0
        END) AS mid_third_lost,
        SUM(CASE WHEN phase_norm = 'build-up' AND x_end >= 60 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS regained_atk_half,
        SUM(CASE WHEN phase_norm = 'build-up' AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS bu_possessions,
        SUM(CASE WHEN phase_norm = 'build-up' AND att_third_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_entries,
        SUM(CASE WHEN phase_norm = 'build-up' AND penalty_area_progression > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_into_box,
        SUM(CASE WHEN phase_norm = 'build-up' AND shot_count > 0 AND set_piece_flag = 0 THEN 1 ELSE 0 END) AS final_third_shot
    FROM league_all_enriched
    GROUP BY match_id, team_id, side
),
league_calc AS (
    SELECT
        match_id, team_id, side, bu_minutes, bu_goals, bu_shots, bu_xg, bu_xt, def_third_possessions, final_third_entries,
        CASE WHEN def_third_possessions > 0 THEN def_third_into_mid::float * 100 / def_third_possessions END AS def_third_into_mid_pct,
        CASE WHEN def_third_possessions > 0 THEN def_third_into_final::float * 100 / def_third_possessions END AS def_third_into_final_pct,
        def_third_xt,
        CASE WHEN def_third_possessions > 0 THEN def_third_lost::float * 100 / def_third_possessions END AS def_third_lost_pct,
        mid_third_possessions,
        CASE WHEN mid_third_possessions > 0 THEN mid_third_into_final::float * 100 / mid_third_possessions END AS mid_third_into_final_pct,
        mid_third_xt,
        CASE WHEN mid_third_possessions > 0 THEN mid_third_lost::float * 100 / mid_third_possessions END AS mid_third_lost_pct,
        CASE WHEN bu_possessions > 0 THEN regained_atk_half::float * 100 / bu_possessions END AS regained_atk_half_pct,
        CASE WHEN final_third_entries > 0 THEN final_third_into_box::float * 100 / final_third_entries END AS final_third_into_box_pct,
        CASE WHEN final_third_entries > 0 THEN final_third_shot::float * 100 / final_third_entries END AS final_third_shot_pct,
        CASE WHEN final_third_entries > 0 THEN bu_xg::float / final_third_entries END AS xg_per_entry
    FROM league_agg
),
league_avg AS (
    SELECT
        team_id, side,
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
    FROM league_calc
    GROUP BY team_id, side
),
league_rank AS (
    SELECT
        team_id, side,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN bu_minutes END ASC, CASE WHEN side = 'team' THEN bu_minutes END DESC) AS bu_minutes_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN bu_goals END ASC, CASE WHEN side = 'team' THEN bu_goals END DESC) AS bu_goals_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN bu_shots END ASC, CASE WHEN side = 'team' THEN bu_shots END DESC) AS bu_shots_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN bu_xg END ASC, CASE WHEN side = 'team' THEN bu_xg END DESC) AS bu_xg_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN bu_xt END ASC, CASE WHEN side = 'team' THEN bu_xt END DESC) AS bu_xt_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN def_third_possessions END ASC, CASE WHEN side = 'team' THEN def_third_possessions END DESC) AS def_third_possessions_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN def_third_into_mid_pct END ASC, CASE WHEN side = 'team' THEN def_third_into_mid_pct END DESC) AS def_third_into_mid_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN def_third_into_final_pct END ASC, CASE WHEN side = 'team' THEN def_third_into_final_pct END DESC) AS def_third_into_final_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN def_third_xt END ASC, CASE WHEN side = 'team' THEN def_third_xt END DESC) AS def_third_xt_rank,
        RANK() OVER (PARTITION BY side ORDER BY def_third_lost_pct DESC) AS def_third_lost_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN mid_third_possessions END ASC, CASE WHEN side = 'team' THEN mid_third_possessions END DESC) AS mid_third_possessions_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN mid_third_into_final_pct END ASC, CASE WHEN side = 'team' THEN mid_third_into_final_pct END DESC) AS mid_third_into_final_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN mid_third_xt END ASC, CASE WHEN side = 'team' THEN mid_third_xt END DESC) AS mid_third_xt_rank,
        RANK() OVER (PARTITION BY side ORDER BY mid_third_lost_pct DESC) AS mid_third_lost_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY regained_atk_half_pct DESC) AS regained_atk_half_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN final_third_entries END ASC, CASE WHEN side = 'team' THEN final_third_entries END DESC) AS final_third_entries_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN final_third_into_box_pct END ASC, CASE WHEN side = 'team' THEN final_third_into_box_pct END DESC) AS final_third_into_box_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN final_third_shot_pct END ASC, CASE WHEN side = 'team' THEN final_third_shot_pct END DESC) AS final_third_shot_pct_rank,
        RANK() OVER (PARTITION BY side ORDER BY CASE WHEN side = 'opponent' THEN xg_per_entry END ASC, CASE WHEN side = 'team' THEN xg_per_entry END DESC) AS xg_per_entry_rank
    FROM league_avg
),
match_calc AS (
    SELECT
        'match' AS scope, side, bu_minutes, bu_goals, bu_shots, bu_xg, bu_xt, def_third_possessions,
        def_third_into_mid_pct, def_third_into_final_pct, def_third_xt, def_third_lost_pct,
        mid_third_possessions, mid_third_into_final_pct, mid_third_xt, mid_third_lost_pct,
        regained_atk_half_pct, final_third_entries, final_third_into_box_pct, final_third_shot_pct, xg_per_entry
    FROM league_calc
    WHERE match_id = $1 AND team_id = $2
),
season_avg_final AS (
    SELECT
        'season_avg' AS scope, side, bu_minutes, bu_goals, bu_shots, bu_xg, bu_xt, def_third_possessions,
        def_third_into_mid_pct, def_third_into_final_pct, def_third_xt, def_third_lost_pct,
        mid_third_possessions, mid_third_into_final_pct, mid_third_xt, mid_third_lost_pct,
        regained_atk_half_pct, final_third_entries, final_third_into_box_pct, final_third_shot_pct, xg_per_entry
    FROM league_avg
    WHERE team_id = $2
),
league_rank_team AS (
    SELECT * FROM league_rank WHERE team_id = $2
)
SELECT
    m.*,
    NULL::int AS bu_minutes_rank, NULL::int AS bu_goals_rank, NULL::int AS bu_shots_rank, NULL::int AS bu_xg_rank, NULL::int AS bu_xt_rank,
    NULL::int AS def_third_possessions_rank, NULL::int AS def_third_into_mid_pct_rank, NULL::int AS def_third_into_final_pct_rank, NULL::int AS def_third_xt_rank, NULL::int AS def_third_lost_pct_rank,
    NULL::int AS mid_third_possessions_rank, NULL::int AS mid_third_into_final_pct_rank, NULL::int AS mid_third_xt_rank, NULL::int AS mid_third_lost_pct_rank,
    NULL::int AS regained_atk_half_pct_rank, NULL::int AS final_third_entries_rank, NULL::int AS final_third_into_box_pct_rank, NULL::int AS final_third_shot_pct_rank, NULL::int AS xg_per_entry_rank
FROM match_calc m
UNION ALL
SELECT
    s.*,
    r.bu_minutes_rank, r.bu_goals_rank, r.bu_shots_rank, r.bu_xg_rank, r.bu_xt_rank,
    r.def_third_possessions_rank, r.def_third_into_mid_pct_rank, r.def_third_into_final_pct_rank, r.def_third_xt_rank, r.def_third_lost_pct_rank,
    r.mid_third_possessions_rank, r.mid_third_into_final_pct_rank, r.mid_third_xt_rank, r.mid_third_lost_pct_rank,
    r.regained_atk_half_pct_rank, r.final_third_entries_rank, r.final_third_into_box_pct_rank, r.final_third_shot_pct_rank, r.xg_per_entry_rank
FROM season_avg_final s
LEFT JOIN league_rank_team r ON r.side = s.side
ORDER BY scope, side;