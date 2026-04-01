SELECT
  match_id,
  period,
  MAX(timestamp) AS max_timestamp
FROM silver.events
WHERE match_id = $1
GROUP BY match_id, period
ORDER BY period
