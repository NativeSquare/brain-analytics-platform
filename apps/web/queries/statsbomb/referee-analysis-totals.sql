WITH RefereeTotals AS (
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
    AND m.referee_id = $1
    AND ($2::int IS NULL OR m.competition_id = $2)
  GROUP BY m.referee_id, m.referee_name
)
SELECT
  referee_id,
  referee_name,
  matches,
  fouls,
  advantages,
  yellow_cards,
  second_yellow_cards,
  straight_red_cards,
  red_cards,
  penalties,
  ROUND(fouls * 1.0 / NULLIF(matches, 0), 2) AS fouls_per_match,
  ROUND(advantages * 1.0 / NULLIF(matches, 0), 2) AS advantages_per_match,
  ROUND(yellow_cards * 1.0 / NULLIF(matches, 0), 2) AS yellow_cards_per_match,
  ROUND(second_yellow_cards * 1.0 / NULLIF(matches, 0), 2) AS second_yellow_cards_per_match,
  ROUND(straight_red_cards * 1.0 / NULLIF(matches, 0), 2) AS straight_red_cards_per_match,
  ROUND(red_cards * 1.0 / NULLIF(matches, 0), 2) AS red_cards_per_match,
  ROUND(penalties * 1.0 / NULLIF(matches, 0), 2) AS penalties_per_match
FROM RefereeTotals

