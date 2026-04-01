select
  f.id,
  to_char(f.starting_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as starting_at,
  ft_home.participant_id as home_team_id,
  ft_away.participant_id as away_team_id,
  t_home.name as home_team_name,
  t_away.name as away_team_name,
  t_home.image_path as home_team_logo,
  t_away.image_path as away_team_logo,
  home_score.goals as home_score,
  away_score.goals as away_score,
  f.state_id,
  case
    when f.state_id in (1, 2, 3, 4, 13) then 'upcoming'
    when f.state_id in (5) then 'finished'
    when f.state_id in (6, 7, 8, 9, 10, 11, 12) then 'other'
    else 'unknown'
  end as status,
  l.name as competition_name
from fixtures f
join fixture_teams ft_home
  on ft_home.fixture_id = f.id
 and lower(ft_home.location) = 'home'
join fixture_teams ft_away
  on ft_away.fixture_id = f.id
 and lower(ft_away.location) = 'away'
join teams t_home on t_home.id = ft_home.participant_id
join teams t_away on t_away.id = ft_away.participant_id
left join leagues l on l.id = f.league_id

left join lateral (
  select (s.score->>'goals')::int as goals
  from scores s
  where s.fixture_id = f.id
    and s.participant_id = ft_home.participant_id
  order by
    (s.description = 'CURRENT') desc,
    s.type_id desc,
    s.id desc
  limit 1
) as home_score on true

left join lateral (
  select (s.score->>'goals')::int as goals
  from scores s
  where s.fixture_id = f.id
    and s.participant_id = ft_away.participant_id
  order by
    (s.description = 'CURRENT') desc,
    s.type_id desc,
    s.id desc
  limit 1
) as away_score on true

where f.starting_at is not null
  {{FILTERS}}
order by {{ORDER}}
limit $1
