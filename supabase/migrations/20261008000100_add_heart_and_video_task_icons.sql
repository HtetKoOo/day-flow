-- Expand the appearance picker without invalidating existing task icons.
alter table public.tasks
  drop constraint if exists tasks_icon_check;

alter table public.tasks
  add constraint tasks_icon_check check (icon is null or icon in (
    'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
    'book-open', 'lightbulb', 'message-circle', 'coffee', 'laptop',
    'house', 'shopping-bag', 'heart-pulse', 'heart', 'video', 'moon'
  ));

alter table public.recurring_tasks
  drop constraint if exists recurring_tasks_icon_check;

alter table public.recurring_tasks
  add constraint recurring_tasks_icon_check check (icon is null or icon in (
    'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
    'book-open', 'lightbulb', 'message-circle', 'coffee', 'laptop',
    'house', 'shopping-bag', 'heart-pulse', 'heart', 'video', 'moon'
  ));
