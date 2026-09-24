-- Additive migration: existing tasks receive sage; ownership/RLS are unchanged.
alter table public.tasks add column color text not null default 'sage'
  check (color in ('sage','mint','teal','sky','lavender','lilac','rose','peach','amber','stone'));
