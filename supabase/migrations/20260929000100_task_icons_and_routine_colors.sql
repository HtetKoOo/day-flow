-- Task icons and routine appearance are additive. Existing rows keep their
-- current task color and use the title-based icon fallback until edited.
alter table public.tasks
  add column if not exists icon text
    check (icon is null or icon in (
      'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
      'book-open', 'lightbulb', 'message-circle', 'coffee', 'laptop',
      'house', 'shopping-bag', 'heart-pulse', 'moon'
    ));

alter table public.recurring_tasks
  add column if not exists color text not null default 'sage'
    check (color in (
      'sage', 'mint', 'teal', 'sky', 'lavender', 'lilac',
      'rose', 'peach', 'amber', 'stone'
    )),
  add column if not exists icon text
    check (icon is null or icon in (
      'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
      'book-open', 'lightbulb', 'message-circle', 'coffee', 'laptop',
      'house', 'shopping-bag', 'heart-pulse', 'moon'
    ));
