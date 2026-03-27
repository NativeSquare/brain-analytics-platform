# StatsBomb Database Schema Reference

This document is the LLM reference for all tables in the **silver** and **gold** schemas of the StatsBomb PostgreSQL database. Use it to construct queries via `mcp__statsbomb_db__execute_sql`.

---

## Key conventions

- All event tables join to `silver.events` on `event_id`.
- All match-level tables join on `match_id`.
- `op_` prefix = open play. `sp_` prefix = set piece. `np_` prefix = non-penalty.
- Per-90 metrics in `player_season_stats` are suffixed `_90`.
- Per-game metrics in `team_season_stats` are suffixed `_pg`.
- Pitch coordinates: x = 0–120 (goal to goal), y = 0–80 (left to right).
- OBV = On-Ball Value (StatsBomb's possession-value metric).
- xT = Expected Threat.
- xG = Expected Goals.
- PPDA = Passes Per Defensive Action (pressing intensity).

---

## Schema: `silver`

Raw and cleaned StatsBomb event data. 41 tables.

---

### `silver.competitions`
Lookup of all available competition × season combinations.

| Column | Type | Description |
|--------|------|-------------|
| competition_id | bigint | PK |
| season_id | bigint | PK |
| country_name | text | Country of competition |
| competition_name | text | e.g. "Serie A" |
| competition_gender | text | "male" / "female" |
| competition_youth | boolean | Youth competition flag |
| competition_international | boolean | International competition flag |
| season_name | text | e.g. "2024/2025" |
| match_updated | text | Last match data update timestamp |
| match_updated_360 | text | Last 360 data update |
| match_available_360 | text | 360 data availability timestamp |
| match_available | text | Match data availability timestamp |

---

### `silver.matches`
One row per match. Full match metadata including teams, referee, stadium.

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | PK |
| match_date | date | Date of the match |
| kick_off | text | Kick-off time |
| match_start | timestamp | Full UTC timestamp of match start |
| match_week | bigint | Matchday number |
| home_score | integer | Full-time home score |
| away_score | integer | Full-time away score |
| attendance | integer | Attendance figure |
| behind_closed_doors | boolean | Closed doors flag |
| neutral_ground | boolean | Neutral venue flag |
| competition_id | bigint | FK → competitions |
| competition_name | text | Competition name |
| competition_country_name | text | Country name |
| season_id | bigint | FK → competitions |
| season_name | text | Season name |
| home_team_id | bigint | Home team ID |
| home_team_name | text | Home team name |
| home_team_gender | text | Team gender |
| home_team_youth | boolean | Youth team flag |
| home_team_country_id | bigint | Home team country |
| home_team_country_name | text | Home team country name |
| home_team_managers | json | Array of manager objects |
| away_team_id | bigint | Away team ID |
| away_team_name | text | Away team name |
| away_team_gender | text | Team gender |
| away_team_youth | boolean | Youth team flag |
| away_team_country_id | bigint | Away team country |
| away_team_country_name | text | Away team country name |
| away_team_managers | json | Array of manager objects |
| competition_stage_id | bigint | Stage ID (group, final, etc.) |
| competition_stage_name | text | Stage name |
| stadium_id | bigint | Stadium ID |
| stadium_name | text | Stadium name |
| stadium_country_id | bigint | Stadium country |
| stadium_country_name | text | Stadium country name |
| referee_id | bigint | Referee ID |
| referee_name | text | Referee name |
| referee_country_id | bigint | Referee country |
| referee_country_name | text | Referee country name |
| match_status | text | Data collection status |
| match_status_360 | text | 360 data status |
| collection_status | text | Collection status |
| play_status | text | Play status |
| last_updated | text | Last data update |
| last_updated_360 | text | Last 360 update |
| metadata_data_version | text | StatsBomb data version |
| metadata_xy_fidelity_version | text | XY fidelity version |

---

### `silver.lineups`
One row per player per team per match. Includes physical attributes and match contributions.

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | FK → matches |
| player_id | bigint | Player ID |
| team_id | bigint | Team ID |
| team_name | text | Team name |
| player_name | text | Full player name |
| player_nickname | text | Known name / nickname |
| birth_date | text | Date of birth |
| player_gender | text | Player gender |
| player_height | float | Height in cm |
| player_weight | float | Weight in kg |
| jersey_number | bigint | Shirt number |
| country_id | bigint | Nationality ID |
| country_name | text | Nationality |
| positions | text | JSON-encoded position list |
| formations | text | Team formation(s) used |
| goals | float | Goals scored |
| own_goals | float | Own goals |
| assists | float | Assists |
| penalties_scored | float | Penalties scored |
| penalties_missed | float | Penalties missed |
| penalties_saved | float | Penalties saved (GK) |
| competition_id | text | Competition ID |
| season_id | text | Season ID |
| match_date | text | Match date |
| kick_off | text | Kick-off time |
| match_date_utc | text | UTC match date |
| events | text | Related event IDs |

---

### `silver.events`
Master event table. One row per event in a match. Join to event-specific tables via `event_id` for detailed attributes. Contains OBV values for all events.

| Column | Type | Description |
|--------|------|-------------|
| event_id | varchar | PK (UUID) |
| match_id | bigint | FK → matches |
| index | bigint | Sequential order within match |
| period | bigint | 1=H1, 2=H2, 3=ET1, 4=ET2, 5=Penalty shootout |
| timestamp | text | Time within period (HH:MM:SS.mmm) |
| minute | bigint | Minute of match |
| second | bigint | Second within minute |
| event_type_id | bigint | Event type code |
| event_type_name | text | e.g. "Pass", "Shot", "Carry", "Pressure" |
| player_id | bigint | Player performing the event |
| player_name | text | Player name |
| team_id | bigint | Team performing the event |
| team_name | text | Team name |
| position_id | bigint | Player position code |
| position_name | text | Player position name |
| location_x | float | X coordinate on pitch (0–120) |
| location_y | float | Y coordinate on pitch (0–80) |
| location_z | float | Z coordinate (height) |
| duration | float | Duration of event in seconds |
| under_pressure | boolean | Whether player was under pressure |
| counterpress | boolean | Whether event is a counterpress |
| off_camera | boolean | Out of camera view |
| out | boolean | Ball went out of play |
| play_pattern_id | bigint | Play pattern code |
| play_pattern_name | text | e.g. "Regular Play", "From Corner", "From Free Kick" |
| possession | bigint | Possession sequence number |
| possession_chain | text | Possession chain identifier |
| possession_team_id | bigint | Team in possession |
| possession_team_name | text | Team in possession name |
| related_events | text | JSON array of related event IDs |
| data | json | Full raw event JSON (all sub-attributes) |
| obv_for_before | float | OBV for possessing team before event |
| obv_for_after | float | OBV for possessing team after event |
| obv_for_net | float | Net OBV change for possessing team |
| obv_against_before | float | OBV for opposing team before event |
| obv_against_after | float | OBV for opposing team after event |
| obv_against_net | float | Net OBV change for opposing team |
| obv_total_net | float | Total net OBV (for - against) |

---

## Event-Specific Tables

All event-specific tables share these base columns:
- `event_id` (varchar, PK, FK → silver.events)
- `match_id` (bigint)
- `player_id` (bigint)
- `team_id` (bigint)

Only additional columns are listed below.

---

### `silver.event_passes`
All passing events with full pass attributes.

| Column | Type | Description |
|--------|------|-------------|
| pass_length | float | Pass distance in metres |
| pass_angle | float | Pass angle in radians |
| pass_end_location_x | float | End x coordinate |
| pass_end_location_y | float | End y coordinate |
| pass_body_part_id/name | bigint/text | Head, Right Foot, Left Foot, etc. |
| pass_height_id/name | bigint/text | Ground Pass, Low Pass, High Pass |
| pass_technique_id/name | bigint/text | Technique used |
| pass_type_id/name | bigint/text | Corner, Free Kick, Throw-in, Goal Kick, etc. |
| pass_outcome_id/name | bigint/text | Complete, Incomplete, Out, Offside, etc. (null = complete) |
| pass_recipient_id | bigint | Intended recipient player ID |
| pass_recipient_name | text | Intended recipient name |
| pass_cross | boolean | Was it a cross? |
| pass_cut_back | boolean | Cut-back pass |
| pass_through_ball | boolean | Through ball |
| pass_switch | boolean | Switch of play |
| pass_backheel | boolean | Backheel pass |
| pass_straight | boolean | Straight pass |
| pass_inswinging | boolean | Inswinging delivery |
| pass_outswinging | boolean | Outswinging delivery |
| pass_deflected | boolean | Was the pass deflected? |
| pass_no_touch | boolean | No-touch pass |
| pass_miscommunication | boolean | Miscommunication with recipient |
| pass_goal_assist | boolean | Direct assist for goal |
| pass_shot_assist | boolean | Led to a shot |
| pass_assisted_shot_id | varchar | FK to the resulting shot event |
| pass_pass_success_probability | float | Model probability of completion |
| pass_pass_cluster_id | bigint | Pass cluster classification |
| pass_pass_cluster_label | text | Human-readable cluster label |
| pass_pass_cluster_probability | float | Cluster assignment probability |
| pass_xclaim | float | Expected Claim (GK) |

---

### `silver.event_shots`
All shot events with outcome, technique, xG, and GK response metrics.

| Column | Type | Description |
|--------|------|-------------|
| shot_statsbomb_xg | float | StatsBomb xG value |
| shot_outcome_id/name | bigint/text | Goal, Saved, Off T, Blocked, Wayward, Post |
| shot_type_id/name | bigint/text | Open Play, Corner, Free Kick, Penalty |
| shot_body_part_id/name | bigint/text | Head, Right Foot, Left Foot, No Touch |
| shot_technique_id/name | bigint/text | Normal, Volley, Half Volley, Overhead Kick, Diving Header |
| shot_end_location_x | float | End x coordinate |
| shot_end_location_y | float | End y coordinate |
| shot_end_location_z | float | End z coordinate (height) |
| shot_key_pass_id | varchar | FK to the key pass event |
| shot_first_time | boolean | First-time shot |
| shot_follows_dribble | boolean | Shot after a dribble |
| shot_one_on_one | boolean | One-on-one with GK |
| shot_open_goal | boolean | Open goal |
| shot_aerial_won | boolean | Aerial shot |
| shot_deflected | boolean | Deflected shot |
| shot_saved_off_target | boolean | Saved then went out |
| shot_saved_to_post | boolean | Saved to post |
| shot_redirect | boolean | Redirect/deflected goal |
| shot_kick_off | boolean | Shot from kick-off |
| shot_freeze_frame | text | JSON array of player positions at shot moment |
| shot_shot_execution_xg | float | xG accounting for execution quality |
| shot_shot_execution_xg_uplift | float | xG uplift from execution |
| shot_shot_goal_assist | boolean | Goal assist flag |
| shot_shot_shot_assist | boolean | Shot assist flag |
| shot_gk_positioning_xg_suppression | float | GK positioning suppression on xG |
| shot_gk_save_difficulty_xg | float | xG difficulty for GK |
| shot_gk_shot_stopping_xg_suppression | float | GK shot-stopping suppression |

---

### `silver.event_carries`
Ball carries (running with the ball).

| Column | Type | Description |
|--------|------|-------------|
| carry_end_location_x | float | End x coordinate of carry |
| carry_end_location_y | float | End y coordinate of carry |

---

### `silver.event_dribbles`
Take-on / dribble attempts.

| Column | Type | Description |
|--------|------|-------------|
| dribble_outcome_id/name | bigint/text | Complete, Incomplete |
| dribble_nutmeg | boolean | Nutmeg |
| dribble_overrun | boolean | Ball overrun |
| dribble_no_touch | boolean | No touch dribble |

---

### `silver.event_duels`
Aerial and ground duels.

| Column | Type | Description |
|--------|------|-------------|
| duel_type_id/name | bigint/text | Aerial Lost, Tackle, etc. |
| duel_outcome_id/name | bigint/text | Won, Lost, Success in Play, etc. |

---

### `silver.event_pressures`
Pressing events (no extra columns beyond base). Used for counting pressures and press intensity analysis.

---

### `silver.event_goalkeeper_actions`
Goalkeeper interventions (saves, punches, claims, etc.).

| Column | Type | Description |
|--------|------|-------------|
| goalkeeper_type_id/name | bigint/text | Shot Saved, Punch, Claim, Keeper Sweeper, etc. |
| goalkeeper_outcome_id/name | bigint/text | Saved, Punched Out, Success In Play, No Touch, etc. |
| goalkeeper_technique_id/name | bigint/text | Diving, Standing, etc. |
| goalkeeper_body_part_id/name | bigint/text | Hands, Head, Feet, etc. |
| goalkeeper_position_id/name | bigint/text | Set, Moving, etc. |
| goalkeeper_end_location_x | float | End x position |
| goalkeeper_end_location_y | float | End y position |
| goalkeeper_punched_out | boolean | Punched clear |
| goalkeeper_shot_saved_off_target | boolean | Save that went out |
| goalkeeper_shot_saved_to_post | boolean | Save to post |
| goalkeeper_success_in_play | boolean | Success kept in play |
| goalkeeper_success_out | boolean | Success cleared out |
| goalkeeper_lost_out | boolean | Lost, ball went out |

---

### `silver.event_interceptions`

| Column | Type | Description |
|--------|------|-------------|
| interception_outcome_id/name | bigint/text | Won, Lost, Success in Play, etc. |

---

### `silver.event_clearances`
Defensive clearances.

| Column | Type | Description |
|--------|------|-------------|
| clearance_aerial_won | boolean | Aerial clearance won |
| clearance_body_part_id/name | bigint/text | Head, Right Foot, Left Foot |
| clearance_head | boolean | Headed clearance |
| clearance_left_foot | boolean | Left foot clearance |
| clearance_right_foot | boolean | Right foot clearance |
| clearance_other | boolean | Other body part |

---

### `silver.event_blocks`

| Column | Type | Description |
|--------|------|-------------|
| block_deflection | boolean | Deflected the block |
| block_offensive | boolean | Offensive block |
| block_save_block | boolean | Saved a shot (GK-like block) |

---

### `silver.event_fouls_committed`

| Column | Type | Description |
|--------|------|-------------|
| foul_committed_type_id/name | bigint/text | Foul type (handball, dangerous play, etc.) |
| foul_committed_card_id/name | bigint/text | Yellow Card, Second Yellow, Red Card (null if no card) |
| foul_committed_penalty | boolean | Foul resulted in penalty |
| foul_committed_offensive | boolean | Offensive foul |
| foul_committed_advantage | boolean | Advantage played |

---

### `silver.event_fouls_won`

| Column | Type | Description |
|--------|------|-------------|
| foul_won_penalty | boolean | Foul won resulted in penalty |
| foul_won_defensive | boolean | Defensive foul won |
| foul_won_advantage | boolean | Advantage played |

---

### `silver.event_bad_behaviours`
Yellow/red cards outside of fouls (e.g. dissent).

| Column | Type | Description |
|--------|------|-------------|
| bad_behaviour_card_id/name | bigint/text | Yellow Card, Second Yellow, Red Card |

---

### `silver.event_substitutions`

| Column | Type | Description |
|--------|------|-------------|
| substitution_replacement_id | bigint | Player coming on |
| substitution_replacement_name | text | Player coming on name |
| substitution_outcome_id/name | bigint/text | Reason (Injury, Tactical, etc.) |

---

### `silver.event_tactics`
Formation changes / lineup announcements.

| Column | Type | Description |
|--------|------|-------------|
| tactics_formation | bigint | Formation code (e.g. 433, 4231) |
| tactics_lineup | text | JSON array of player-position assignments |

---

### `silver.event_ball_receipts`

| Column | Type | Description |
|--------|------|-------------|
| ball_receipt_outcome_id/name | bigint/text | Complete or Incomplete (dropped/lost) |

---

### `silver.event_ball_recoveries`

| Column | Type | Description |
|--------|------|-------------|
| ball_recovery_offensive | boolean | Offensive recovery |
| ball_recovery_recovery_failure | boolean | Recovery attempt failed |

---

### `silver.event_fifty_fifty`
Contested 50/50 balls.

| Column | Type | Description |
|--------|------|-------------|
| fifty_fifty_outcome_id/name | bigint/text | Won, Lost, Success To Opposition, etc. |

---

### `silver.event_miscontrols`

| Column | Type | Description |
|--------|------|-------------|
| miscontrol_aerial_won | boolean | Miscontrol on aerial ball |

---

### `silver.event_half_starts`

| Column | Type | Description |
|--------|------|-------------|
| half_start_late_video_start | boolean | Video started late for this half |

---

### `silver.event_injury_stoppages`

| Column | Type | Description |
|--------|------|-------------|
| injury_stoppage_in_chain | boolean | Occurred mid-possession chain |

---

### `silver.event_player_offs`
Player temporarily off the pitch.

| Column | Type | Description |
|--------|------|-------------|
| permanent | boolean | Permanent departure (red card) vs temporary |

---

### Minimal-column event tables
The following tables have only base columns (`event_id`, `match_id`, `player_id`, `team_id`). They mark the occurrence of that event type and are counted against `silver.events`.

| Table | Description |
|-------|-------------|
| `event_dribbled_pasts` | Defender who was dribbled past |
| `event_half_ends` | End of a period |
| `event_offsides` | Offside calls |
| `event_own_goals_against` | Own goal conceded |
| `event_own_goals_for` | Own goal received (benefiting team) |
| `event_player_ons` | Player returning to pitch |
| `event_shields` | Shielding the ball |
| `event_ball_drops` | Goalkeeper ball drop |
| `event_dispossessed` | Player dispossessed |
| `event_errors` | Defensive/goalkeeping errors |

---

### `silver.player_match_stats`
Pre-aggregated per-player-per-match stats. 100+ columns. Key groups:

**Identity**: `match_id`, `player_id`, `player_name`, `team_id`, `team_name`, `account_id`

**Shooting**: `player_match_np_xg`, `player_match_np_shots`, `player_match_goals`, `player_match_np_goals`, `player_match_np_xg_per_shot`, `player_match_np_shots_on_target`, `player_match_op_shots`

**Chance creation**: `player_match_xa`, `player_match_key_passes`, `player_match_op_key_passes`, `player_match_assists`, `player_match_op_assists`, `player_match_through_balls`, `player_match_passes_into_box`, `player_match_op_passes_into_box`, `player_match_sp_xa`, `player_match_crosses`, `player_match_successful_crosses`, `player_match_crossing_ratio`, `player_match_crosses_into_box`

**Passing**: `player_match_passes`, `player_match_successful_passes`, `player_match_passing_ratio`, `player_match_op_passes`, `player_match_forward_passes`, `player_match_backward_passes`, `player_match_sideways_passes`, `player_match_long_balls`, `player_match_successful_long_balls`, `player_match_long_ball_ratio`, `player_match_deep_progressions`, `player_match_deep_completions`, `player_match_op_f3_passes`

**Carrying/Dribbling**: `player_match_dribbles`, `player_match_dribbled_past`, `player_match_dribbles_faced`, `player_match_challenge_ratio`, `player_match_touches`, `player_match_touches_inside_box`, `player_match_shot_touch_ratio`

**Defence**: `player_match_tackles`, `player_match_interceptions`, `player_match_clearances`, `player_match_shots_blocked`, `player_match_aerials`, `player_match_successful_aerials`, `player_match_aerial_ratio`, `player_match_ball_recoveries`, `player_match_fhalf_ball_recoveries`, `player_match_fouls`, `player_match_fouls_won`, `player_match_dispossessions`

**Pressing**: `player_match_pressures`, `player_match_pressure_duration_total`, `player_match_pressure_duration_avg`, `player_match_pressured_action_fails`, `player_match_counterpressures`, `player_match_pressure_regains`

**Possession chain**: `player_match_xgchain`, `player_match_op_xgchain`, `player_match_xgbuildup`, `player_match_op_xgbuildup`, `player_match_xgchain_per_possession`, `player_match_xgbuildup_per_possession`, `player_match_possession`

**OBV**: `player_match_obv`, `player_match_obv_pass`, `player_match_obv_shot`, `player_match_obv_defensive_action`, `player_match_obv_dribble_carry`, `player_match_obv_gk`

**Goalkeeper**: `player_match_np_psxg`, `player_match_penalties_faced`, `player_match_penalties_conceded`

**Spatial**: `player_match_average_space_received_in`, `player_match_average_fhalf_space_received_in`, `player_match_average_f3_space_received_in`

**Minutes**: `player_match_minutes`

---

### `silver.player_season_stats`
Same metrics as `player_match_stats` but aggregated over a full season. Raw totals and per-90 normalised rates. 100+ columns.

**Identity**: `competition_id`, `season_id`, `player_id`, `player_name`, `team_id`, `team_name`, `competition_name`, `season_name`, `primary_position`, `secondary_position`, `player_first_name`, `player_last_name`, `player_known_name`, `player_height`, `player_weight`, `birth_date`, `player_female`

**All metrics follow the pattern** `player_season_<metric>_90` (per 90 mins) plus raw totals e.g. `player_season_xgchain`, `player_season_xgchain_90`.

Key season-specific: `player_season_minutes`, `player_season_padj_tackles_90`, `player_season_padj_interceptions_90`, `player_season_padj_clearances_90`, `player_season_gsaa_90` (Goals Saved Above Average), `player_season_save_ratio`, `player_season_xs_ratio`, `player_season_goals_faced_90`, `player_season_shots_faced_90`.

---

### `silver.player_shifts`
Tracks each player's positional spell within a match (handles position changes, substitutions).

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | Match |
| team_id | bigint | Team |
| player_id | float | Player |
| season_id | bigint | Season |
| competition_id | bigint | Competition |
| position_name | text | Position during this shift |
| position_group | text | GK / Defender / Midfielder / Forward |
| period_start | bigint | Period shift began |
| timestamp_start | text | Time shift began |
| seconds_start | float | Seconds from period start |
| index_start | bigint | Event index at start |
| period_end | bigint | Period shift ended |
| timestamp_end | text | Time shift ended |
| seconds_end | float | Seconds from period end |
| index_end | float | Event index at end |
| reason_start | text | Why shift started (kick_off, substitution, etc.) |
| reason_end | text | Why shift ended (substitution, period_end, etc.) |
| duration_minutes | float | Duration of this shift in minutes |

---

### `silver.team_match_stats`
Pre-aggregated per-team-per-match stats. 100+ columns. Key groups:

**Identity**: `match_id`, `team_id`, `team_name`, `opposition_id`, `opposition_name`, `competition_id/name`, `season_id/name`, `team_female`

**Attacking**: `team_match_np_xg`, `team_match_op_xg`, `team_match_sp_xg`, `team_match_np_shots`, `team_match_op_shots`, `team_match_sp_shots`, `team_match_np_xg_per_shot`, `team_match_np_shot_distance`, `team_match_goals`, `team_match_own_goals`, `team_match_penalty_goals`

**Defending**: `team_match_np_xg_conceded`, `team_match_op_xg_conceded`, `team_match_sp_xg_conceded`, `team_match_np_shots_conceded`, `team_match_goals_conceded`, `team_match_penalty_goals_conceded`

**Possession/Style**: `team_match_possession`, `team_match_possessions`, `team_match_directness`, `team_match_pace_towards_goal`, `team_match_gk_pass_distance`, `team_match_gk_long_pass_ratio`, `team_match_box_cross_ratio`, `team_match_passes_inside_box`, `team_match_ball_in_play_time`

**Pressing**: `team_match_ppda`, `team_match_defensive_distance`, `team_match_defensive_distance_ppda`, `team_match_opp_passing_ratio`, `team_match_opp_final_third_pass_ratio`

**Goal difference**: `team_match_gd`, `team_match_xgd`

**Set pieces (attacking)**: `team_match_corners`, `team_match_corner_xg`, `team_match_free_kicks`, `team_match_free_kick_xg`, `team_match_direct_free_kicks`, `team_match_direct_free_kick_xg`, `team_match_throw_ins`, `team_match_throw_in_xg` + goals/shots from each

**Set pieces (defending)**: Same metrics with `_conceded` suffix

**Transition**: `team_match_counter_attacking_shots`, `team_match_high_press_shots`, `team_match_shots_in_clear`, + conceded equivalents

**Aggression**: `team_match_aggressive_actions`, `team_match_aggression`

---

### `silver.team_season_stats`
Same metrics as `team_match_stats` but season aggregates. All attacking/defending metrics are per-game averages (suffix `_pg`). 100+ columns.

**Identity**: `competition_id`, `season_id`, `team_id`, `team_name`, `competition_name`, `season_name`, `team_female`, `team_season_matches`, `team_season_minutes`, `team_season_gd`, `team_season_xgd`

Includes `team_season_corner_shot_ratio` and the full set of set-piece analysis metrics per game.

---

## Schema: `gold`

Curated, business-ready tables. 10 tables. Preferred for dashboards and high-level queries.

---

### `gold.competitions`
Slim dimension table.

| Column | Type | Description |
|--------|------|-------------|
| competition_id | bigint | PK |
| competition_name | text | e.g. "Serie A" |
| country_name | text | Country |

---

### `gold.seasons`
Slim dimension table.

| Column | Type | Description |
|--------|------|-------------|
| season_id | bigint | PK |
| season_name | text | e.g. "2024/2025" |

---

### `gold.teams`
Slim dimension table.

| Column | Type | Description |
|--------|------|-------------|
| team_id | bigint | PK |
| team_name | text | Team name |
| country_id | bigint | Country ID |
| country | text | Country name |

---

### `gold.players`
Player master with physical attributes.

| Column | Type | Description |
|--------|------|-------------|
| player_id | bigint | PK |
| player_name | text | Full name |
| date_of_birth | text | Date of birth |
| gender | text | Gender |
| height | float | Height in cm |
| weight | float | Weight in kg |
| jersey_number | bigint | Shirt number |
| country_id | float | Nationality ID |
| country_name | text | Nationality |

---

### `gold.team_matches`
One row per team per match. Clean match result view. **Best table for league table / form queries.**

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | Match ID |
| competition_id | bigint | Competition |
| season_id | bigint | Season |
| match_date | date | Match date |
| match_start | timestamp | Match start datetime |
| match_week | bigint | Matchday |
| team_id | bigint | Team |
| team_name | text | Team name |
| opponent_team_id | bigint | Opponent |
| opponent_team_name | text | Opponent name |
| goals_scored | bigint | Goals scored by this team |
| goals_conceded | bigint | Goals conceded |
| result | text | "W", "D", "L" |
| venue | text | "Home" or "Away" |
| points | bigint | Points (3/1/0) |
| match_duration | float | Duration in minutes |
| competition_stage_name | text | Stage (Regular Season, etc.) |

---

### `gold.player_matches`
One row per player per match. Basic participation data.

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | Match ID |
| team_id | bigint | Team |
| player_id | bigint | Player |
| jersey_number | bigint | Shirt number |
| goals | float | Goals scored |
| own_goals | float | Own goals |
| assists | float | Assists |
| minutes_played | float | Minutes on pitch |
| position_group | text | GK / Defender / Midfielder / Forward |
| is_starter | boolean | Started the match |

---

### `gold.match_expected_stats`
Pre-match win probabilities and xG per team per match.

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | Match ID |
| team_id | bigint | Team |
| team_name | text | Team name |
| expected_goals | bigint | Expected goals total |
| total_xg | float | Total xG in match |
| expected_points | float | Expected points from this match |
| win_probability | float | Pre-match win probability (0–1) |
| draw_probability | float | Pre-match draw probability |
| loss_probability | float | Pre-match loss probability |

---

### `gold.match_period_stats`
Final-third entries per period per team. Useful for half-by-half analysis.

| Column | Type | Description |
|--------|------|-------------|
| match_id | bigint | PK |
| team_id | bigint | PK |
| period | bigint | PK (1=H1, 2=H2, etc.) |
| F3_entry_pass | bigint | Final-third entries by pass |
| F3_entry_carry | bigint | Final-third entries by carry |
| F3_entry_successfull | bigint | Successful final-third entries |
| Total_entry | bigint | Total final-third entries |

---

### `gold.possessions`
One row per possession chain in a match. Very rich table with 100+ columns. **Best table for possession and transition analysis.**

**Identity**: `match_id`, `competition_id`, `season_id`, `possession_number`, `period`, `possession_team` / `possession_team_id`, `out_of_possession_team` / `out_of_possession_team_id`, `possession_team_change`

**Events**: `start_event_id`, `end_event_id`, `start_index`, `end_index`, `start_event_type_id`, `start_possession_type`

**Timing**: `start_time`, `end_time`, `duration_seconds`, `time_since_last_possession`

**Set piece**: `set_piece_type`, `direct_sp`, `sp` (flag), `attacking_sp_shot`

**Classification flags** (int 0/1): `op`, `sp`, `transition`, `transition_build_up`, `quick`, `build_up`, `restart`, `restart_direct`, `restart_build_up`, `regain`, `contested`, `contested_won`, `retained`, `gk`, `gk_reset_turnover`, `sp_end_turnover`, `success`

**Build-up type**: `direct_long`, `short_then_long`, `short`, `gk_reset_long`

**Spatial**: `x_start`, `y_start`, `x_end`, `y_end`, `x_distance`, `x_speed`, `third` (def/mid/att), `first_pass_direction`

**Touches by zone**: `def_third_touches`, `mid_third_touches`, `mid_att_third_touches`, `att_third_touches`, `penalty_area_touches`

**Progression metrics**: `mid_third_progression`, `att_third_progression`, `penalty_area_progression`, `att_third_progression_10_seconds`, `penalty_area_progression_10_seconds`

**Time to zone**: `time_to_def_third_seconds`, `time_to_mid_third_seconds`, `time_to_att_third_seconds`, `time_to_penalty_area_seconds`, `time_to_shot`, `time_to_regain`

**Shots & xG**: `shot_count`, `total_xg`, `max_xg`, `conditional_xg`, `x_shot`, `y_shot`, `shot_10_seconds`, `xg_10_seconds`

**xT (Expected Threat)**: `xt_start`, `xt_end`, `xt_max`, `xt_diff`, `xt_diff_10_seconds`

**OBV**: `non_shot_obv_for_net`, `non_shot_obv_total_net`, `successful_pass_non_shot_obv_for_net`, `successful_pass_non_shot_obv_total_net`

**Other**: `touches`, `passes`, `forward_pass_3_seconds`, `forward_pass_3_seconds_count`, `quick_restart`, `goal`, `penalty_won`, `penalty_taken`, `penalty_scored`, `penalty_xg`, `penalty_event_id`, `delivered_first_phase`, `first_contact_won`

---

### `gold.set_pieces`
One row per set piece situation. Detailed delivery and outcome analysis.

| Column | Type | Description |
|--------|------|-------------|
| set_piece_id | text | PK |
| match_id | bigint | Match |
| team_id | bigint | Team taking set piece |
| period | bigint | Period |
| timestamp | timestamp | Time of set piece |
| sp_type | text | Corner, Free Kick, Throw-in, Goal Kick, Kick Off, Penalty |
| sp_zone | text | Zone on pitch |
| side | text | Left / Right / Central |
| taker_id | float | Player taking the set piece |
| technique | text | Delivery technique |
| is_short | boolean | Short set piece |
| is_long_throw | boolean | Long throw-in |
| is_direct_sp | boolean | Direct set piece attempt |
| target | text | Target area of delivery |
| delivered_first_phase | boolean | Ball delivered into box first phase |
| first_contact_won | boolean | Attacking team won first contact |
| second_ball_won | boolean | Won the second ball |
| shots | bigint | Shots resulting from this set piece |
| goal | bigint | Goals scored |
| xg | float | xG of resulting shot(s) |
| delivered_first_phase_player_id | float | Player who delivered first phase |
| delivered_first_phase_event_id | text | Delivery event ID |
| first_phase_first_contact_player_id | float | Player making first contact |
| first_phase_first_contact_event_id | text | First contact event ID |
| first_phase_first_contact_x | float | x coordinate of first contact |
| first_phase_first_contact_y | float | y coordinate of first contact |
| first_phase_first_contact_team_id | float | Team making first contact |
| second_ball_player_id | float | Second ball player |
| second_ball_event_id | text | Second ball event |
| second_ball_x | float | Second ball x coordinate |
| second_ball_y | float | Second ball y coordinate |
| penalty_event_id | text | Related penalty event |
| start_event_id | text | Possession start event |
| end_event_id | text | Possession end event |
| shot_event_ids | text | JSON array of shot event IDs |

---

## Typical Join Patterns

```sql
-- Player stats with match context
SELECT m.match_date, m.home_team_name, m.away_team_name,
       p.player_name, p.player_match_np_xg, p.player_match_goals
FROM silver.player_match_stats p
JOIN silver.matches m ON m.match_id = p.match_id
WHERE p.team_id = <team_id>
  AND m.season_id = <season_id>;

-- Event detail (passes) with base event context
SELECT e.minute, e.player_name, e.location_x, e.location_y,
       ep.pass_length, ep.pass_outcome_name, ep.pass_end_location_x, ep.pass_end_location_y
FROM silver.events e
JOIN silver.event_passes ep ON ep.event_id = e.event_id
WHERE e.match_id = <match_id>;

-- Team season summary (gold)
SELECT tm.match_date, tm.opponent_team_name, tm.result, tm.goals_scored, tm.goals_conceded, tm.points
FROM gold.team_matches tm
WHERE tm.team_id = <team_id>
  AND tm.season_id = <season_id>
ORDER BY tm.match_date;

-- Possession analysis
SELECT possession_type, COUNT(*) as possessions, AVG(total_xg) as avg_xg, SUM(goal) as goals
FROM gold.possessions
WHERE match_id = <match_id>
  AND possession_team_id = <team_id>
GROUP BY possession_type;
```
