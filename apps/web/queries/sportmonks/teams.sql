select
  t.id,
  t.name,
  t.short_code,
  t.image_path as logo_url,
  t.country_id
from teams t
{{FILTERS}}
order by t.name asc
