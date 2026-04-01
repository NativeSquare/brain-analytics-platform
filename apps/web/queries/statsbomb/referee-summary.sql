SELECT
  rs.referee_id,
  rs.referee_name,
  rst.summary,
  rs.leniency,
  rs.penalty_tolerance,
  rs.red_card_tolerance,
  rs.scatter_x,
  rs.scatter_y,
  rs.updated_at
FROM gold.referee_summary rs
JOIN gold.referee_summary_translations rst
  ON rs.referee_id = rst.referee_id
 AND rst.locale = $2
WHERE rs.referee_id = $1
LIMIT 1;
