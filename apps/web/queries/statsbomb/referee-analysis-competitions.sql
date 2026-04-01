SELECT competition_id, competition_name
FROM silver.matches
WHERE match_status = 'available'
  AND competition_id IS NOT NULL
GROUP BY competition_id, competition_name
ORDER BY MAX(match_date) DESC

