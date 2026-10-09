-- Activity-focused icons for study, development, sport, rest, and social time.
alter table public.tasks
  drop constraint if exists tasks_icon_check;

alter table public.tasks
  add constraint tasks_icon_check check (icon is null or icon in (
    'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
    'book-open', 'graduation-cap', 'languages', 'code-2', 'lightbulb',
    'message-circle', 'users-round', 'coffee', 'laptop', 'monitor-play',
    'gamepad-2', 'house', 'shopping-bag', 'trophy', 'circle-dot',
    'heart-pulse', 'heart', 'video', 'bed-double', 'moon'
  ));

alter table public.recurring_tasks
  drop constraint if exists recurring_tasks_icon_check;

alter table public.recurring_tasks
  add constraint recurring_tasks_icon_check check (icon is null or icon in (
    'sunrise', 'focus', 'dumbbell', 'briefcase', 'calendar-check',
    'book-open', 'graduation-cap', 'languages', 'code-2', 'lightbulb',
    'message-circle', 'users-round', 'coffee', 'laptop', 'monitor-play',
    'gamepad-2', 'house', 'shopping-bag', 'trophy', 'circle-dot',
    'heart-pulse', 'heart', 'video', 'bed-double', 'moon'
  ));
