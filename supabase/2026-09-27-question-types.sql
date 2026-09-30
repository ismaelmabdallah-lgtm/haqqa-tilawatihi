begin;

alter table public.questions
  add column if not exists question_type text not null default 'mcq';

alter table public.questions
  add column if not exists points numeric(8,2) not null default 1;

alter table public.questions
  add column if not exists question_data jsonb not null default '{}'::jsonb;

-- حقول MCQ القديمة تبقى موجودة للتوافق،
-- لكنها تصبح قابلة لـ NULL للأنواع الجديدة.
alter table public.questions
  alter column option_a drop not null;

alter table public.questions
  alter column option_b drop not null;

alter table public.questions
  alter column option_c drop not null;

alter table public.questions
  alter column option_d drop not null;

alter table public.questions
  alter column correct_option drop not null;

alter table public.questions
  drop constraint if exists questions_question_type_check;

alter table public.questions
  add constraint questions_question_type_check
  check (
    question_type in (
      'mcq',
      'table',
      'cut_join',
      'conditional',
      'ordering',
      'fill_blanks'
    )
  );

alter table public.questions
  drop constraint if exists questions_points_check;

alter table public.questions
  add constraint questions_points_check
  check (points > 0);

update public.questions
set
  question_type = coalesce(question_type, 'mcq'),
  points = coalesce(points, 1),
  question_data = coalesce(question_data, '{}'::jsonb);

create index if not exists questions_level_chapter_type_active_idx
on public.questions(level_id, chapter_id, question_type, is_active);

commit;