WITH AllReferees AS (
  SELECT referee_id, referee_name
  FROM silver.matches
  WHERE match_status = 'available'
    AND referee_id IS NOT NULL
    AND referee_name IS NOT NULL
    AND ($1::int IS NULL OR competition_id = $1)
  GROUP BY referee_id, referee_name
),
RefereesWithEnoughMatches AS (
  SELECT referee_id, referee_name
  FROM silver.matches
  WHERE match_status = 'available'
    AND referee_id IS NOT NULL
    AND referee_name IS NOT NULL
    AND ($1::int IS NULL OR competition_id = $1)
  GROUP BY referee_id, referee_name
  HAVING COUNT(DISTINCT match_id) >= 10
),
RefereeTotals AS (
  SELECT
    m.referee_id,
    m.referee_name,
    COUNT(DISTINCT m.match_id) AS matches,
    COUNT(f.event_id) AS fouls,
    COUNT(f.foul_committed_advantage) AS advantages,
    SUM(CASE WHEN f.foul_committed_card_id = 7 THEN 1 ELSE 0 END) AS yellow_cards,
    SUM(CASE WHEN f.foul_committed_card_id = 6 THEN 1 ELSE 0 END) AS second_yellow_cards,
    SUM(CASE WHEN f.foul_committed_card_id = 5 THEN 1 ELSE 0 END) AS straight_red_cards,
    SUM(CASE WHEN f.foul_committed_card_id IN (5, 6) THEN 1 ELSE 0 END) AS red_cards,
    COUNT(f.foul_committed_penalty) AS penalties
  FROM silver.matches m
  LEFT JOIN silver.event_fouls_committed f ON m.match_id = f.match_id
  WHERE m.match_status = 'available'
    AND m.referee_id IS NOT NULL
    AND ($1::int IS NULL OR m.competition_id = $1)
  GROUP BY m.referee_id, m.referee_name
),
LeagueTotals AS (
  SELECT
    COUNT(DISTINCT m.match_id) AS matches,
    COUNT(f.event_id) AS fouls,
    COUNT(f.foul_committed_advantage) AS advantages,
    SUM(CASE WHEN f.foul_committed_card_id = 7 THEN 1 ELSE 0 END) AS yellow_cards,
    SUM(CASE WHEN f.foul_committed_card_id = 6 THEN 1 ELSE 0 END) AS second_yellow_cards,
    SUM(CASE WHEN f.foul_committed_card_id = 5 THEN 1 ELSE 0 END) AS straight_red_cards,
    SUM(CASE WHEN f.foul_committed_card_id IN (5, 6) THEN 1 ELSE 0 END) AS red_cards,
    COUNT(f.foul_committed_penalty) AS penalties
  FROM silver.matches m
  LEFT JOIN silver.event_fouls_committed f ON m.match_id = f.match_id
  INNER JOIN RefereesWithEnoughMatches r ON m.referee_id = r.referee_id
  WHERE m.match_status = 'available'
    AND ($1::int IS NULL OR m.competition_id = $1)
)
SELECT
  'referee' AS data_type,
  r.referee_id,
  r.referee_name,
  NULL::int AS matches,
  NULL::int AS fouls,
  NULL::numeric AS fouls_per_match,
  NULL::int AS advantages,
  NULL::numeric AS advantages_per_match,
  NULL::int AS yellow_cards,
  NULL::numeric AS yellow_cards_per_match,
  NULL::int AS second_yellow_cards,
  NULL::numeric AS second_yellow_cards_per_match,
  NULL::int AS straight_red_cards,
  NULL::numeric AS straight_red_cards_per_match,
  NULL::int AS red_cards,
  NULL::numeric AS red_cards_per_match,
  NULL::int AS penalties,
  NULL::numeric AS penalties_per_match,
  NULL::numeric AS league_fouls_per_match,
  NULL::numeric AS league_advantages_per_match,
  NULL::numeric AS league_yellow_cards_per_match,
  NULL::numeric AS league_second_yellow_cards_per_match,
  NULL::numeric AS league_straight_red_cards_per_match,
  NULL::numeric AS league_red_cards_per_match,
  NULL::numeric AS league_penalties_per_match
FROM AllReferees r
UNION ALL
SELECT
  'average' AS data_type,
  rt.referee_id,
  rt.referee_name,
  rt.matches,
  rt.fouls,
  ROUND(rt.fouls * 1.0 / NULLIF(rt.matches, 0), 2) AS fouls_per_match,
  rt.advantages,
  ROUND(rt.advantages * 1.0 / NULLIF(rt.matches, 0), 2) AS advantages_per_match,
  rt.yellow_cards,
  ROUND(rt.yellow_cards * 1.0 / NULLIF(rt.matches, 0), 2) AS yellow_cards_per_match,
  rt.second_yellow_cards,
  ROUND(rt.second_yellow_cards * 1.0 / NULLIF(rt.matches, 0), 2) AS second_yellow_cards_per_match,
  rt.straight_red_cards,
  ROUND(rt.straight_red_cards * 1.0 / NULLIF(rt.matches, 0), 2) AS straight_red_cards_per_match,
  rt.red_cards,
  ROUND(rt.red_cards * 1.0 / NULLIF(rt.matches, 0), 2) AS red_cards_per_match,
  rt.penalties,
  ROUND(rt.penalties * 1.0 / NULLIF(rt.matches, 0), 2) AS penalties_per_match,
  NULL::numeric AS league_fouls_per_match,
  NULL::numeric AS league_advantages_per_match,
  NULL::numeric AS league_yellow_cards_per_match,
  NULL::numeric AS league_second_yellow_cards_per_match,
  NULL::numeric AS league_straight_red_cards_per_match,
  NULL::numeric AS league_red_cards_per_match,
  NULL::numeric AS league_penalties_per_match
FROM RefereeTotals rt
UNION ALL
SELECT
  'league_total' AS data_type,
  NULL::int AS referee_id,
  NULL::text AS referee_name,
  NULL::int AS matches,
  NULL::int AS fouls,
  NULL::numeric AS fouls_per_match,
  NULL::int AS advantages,
  NULL::numeric AS advantages_per_match,
  NULL::int AS yellow_cards,
  NULL::numeric AS yellow_cards_per_match,
  NULL::int AS second_yellow_cards,
  NULL::numeric AS second_yellow_cards_per_match,
  NULL::int AS straight_red_cards,
  NULL::numeric AS straight_red_cards_per_match,
  NULL::int AS red_cards,
  NULL::numeric AS red_cards_per_match,
  NULL::int AS penalties,
  NULL::numeric AS penalties_per_match,
  ROUND(lt.fouls * 1.0 / NULLIF(lt.matches, 0), 2) AS league_fouls_per_match,
  ROUND(lt.advantages * 1.0 / NULLIF(lt.matches, 0), 2) AS league_advantages_per_match,
  ROUND(lt.yellow_cards * 1.0 / NULLIF(lt.matches, 0), 2) AS league_yellow_cards_per_match,
  ROUND(lt.second_yellow_cards * 1.0 / NULLIF(lt.matches, 0), 2) AS league_second_yellow_cards_per_match,
  ROUND(lt.straight_red_cards * 1.0 / NULLIF(lt.matches, 0), 2) AS league_straight_red_cards_per_match,
  ROUND(lt.red_cards * 1.0 / NULLIF(lt.matches, 0), 2) AS league_red_cards_per_match,
  ROUND(lt.penalties * 1.0 / NULLIF(lt.matches, 0), 2) AS league_penalties_per_match
FROM LeagueTotals lt
ORDER BY data_type, referee_name NULLS LAST
