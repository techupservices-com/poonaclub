create table if not exists member_admin_reviews (
  profile_id uuid primary key references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'disapproved')),
  approved_by text,
  approved_at timestamptz,
  disapproved_by text,
  disapproved_at timestamptz,
  disapproved_steps text[] not null default '{}',
  disapproval_message text,
  updated_at timestamptz not null default now()
);

alter table if exists member_verification_snapshot
  add column if not exists admin_review_status text not null default 'pending',
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_rejection_steps text[] not null default '{}',
  add column if not exists admin_rejection_message text;

create index if not exists idx_mvs_admin_review_status on member_verification_snapshot (admin_review_status);
