select
  st.position,
  st.participant_id as team_id,
  t.name as team_name,
  t.image_path as team_logo,
  (st.details->>'overall_games_played')::int as played,
  (st.details->>'overall_won')::int as won,
  (st.details->>'overall_draw')::int as drawn,
  (st.details->>'overall_lost')::int as lost,
  (st.details->>'overall_goals_for')::int as goals_for,
  (st.details->>'overall_goals_against')::int as goals_against,
  coalesce(
    (st.details->>'overall_goals_for')::int - (st.details->>'overall_goals_against')::int,
    0
  ) as goal_difference,
  (st.details->>'overall_points')::int as points
from standings st
join teams t on t.id = st.participant_id
where 1=1
  {{FILTERS}}
order by st.position asc
