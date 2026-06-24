create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  membership_id text not null unique,
  prefix text,
  full_name text not null,
  member_type text,
  status text default 'Active',
  email text,
  email_verified boolean not null default false,
  current_mobile text,
  mobile_verified boolean not null default false,
  date_of_birth date,
  joined_at date,
  address1 text,
  address2 text,
  address3 text,
  city text,
  pincode text,
  photo_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists otp_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  mobile text not null,
  purpose text not null,
  identifier_type text,
  delivery_channel text,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempt_count int not null default 0,
  max_attempts int not null default 5,
  verify_status text not null default 'pending',
  request_id text,
  client_reference text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists mobile_change_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  old_mobile text,
  new_mobile text not null,
  status text not null default 'pending',
  requested_by_profile_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists mobile_login_owners (
  id uuid primary key default gen_random_uuid(),
  mobile text not null unique,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  document_type text not null check (document_type in ('selfie', 'document')),
  document_group text,
  document_part text,
  document_number text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_profile_id uuid references profiles(id),
  action text not null,
  target_profile_id uuid references profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create table if not exists member_verification_snapshot (
  profile_id uuid primary key references profiles(id) on delete cascade,
  membership_id text,
  full_name text,
  member_type text,
  status text,
  current_mobile text,
  email text,
  mobile_verified boolean not null default false,
  email_verified boolean not null default false,
  selfie_uploaded boolean not null default false,
  profile_complete boolean not null default false,
  shared_mobile_count integer not null default 0,
  owner_profile_id uuid null references profiles(id),
  is_mobile_login_owner boolean not null default false,
  shared_mobile_pending boolean not null default false,
  completed boolean not null default false,
  admin_review_status text not null default 'pending' check (admin_review_status in ('pending', 'approved', 'disapproved')),
  admin_reviewed_at timestamptz,
  admin_rejection_steps text[] not null default '{}',
  admin_rejection_message text,
  photo_public_url text,
  updated_at timestamptz not null default now()
);

alter table if exists member_verification_snapshot
  add column if not exists admin_review_status text not null default 'pending',
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_rejection_steps text[] not null default '{}',
  add column if not exists admin_rejection_message text;

create table if not exists broadcast_emails (
  id uuid primary key default gen_random_uuid(),
  created_by text not null,
  selection_mode text not null check (selection_mode in ('selected_visible', 'all_filtered')),
  query_text text not null default '',
  filter_flags text[] not null default '{}',
  template_key text not null,
  subject text not null,
  body_html text not null,
  body_text text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
  total_resolved integer not null default 0,
  total_valid integer not null default 0,
  total_skipped integer not null default 0,
  total_batches integer not null default 0,
  batches_completed integer not null default 0,
  sent_to_provider_count integer not null default 0,
  delivered_count integer not null default 0,
  bounced_count integer not null default 0,
  complained_count integer not null default 0,
  failed_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists broadcast_email_batches (
  id uuid primary key default gen_random_uuid(),
  broadcast_email_id uuid not null references broadcast_emails(id) on delete cascade,
  sequence_no integer not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'sending', 'retryable', 'completed', 'failed')),
  recipient_count integer not null default 0,
  processed_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  attempt_count integer not null default 0,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  idempotency_key text not null,
  last_error text
);

create table if not exists broadcast_email_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_email_id uuid not null references broadcast_emails(id) on delete cascade,
  batch_id uuid references broadcast_email_batches(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  email text not null,
  full_name text not null,
  status text not null default 'pending' check (status in ('pending', 'sent_to_provider', 'delivered', 'bounced', 'complained', 'failed', 'skipped')),
  skip_reason text,
  provider_message_id text,
  provider_last_event text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mvs_membership_id on member_verification_snapshot (membership_id);
create index if not exists idx_mvs_full_name on member_verification_snapshot (full_name);
create index if not exists idx_mvs_current_mobile on member_verification_snapshot (current_mobile);
create index if not exists idx_mvs_email on member_verification_snapshot (email);
create index if not exists idx_mvs_completed on member_verification_snapshot (completed);
create index if not exists idx_mvs_admin_review_status on member_verification_snapshot (admin_review_status);
create index if not exists idx_mvs_shared_mobile_pending on member_verification_snapshot (shared_mobile_pending);
create index if not exists idx_mvs_updated_at on member_verification_snapshot (updated_at desc);
create index if not exists idx_broadcast_emails_status_created_at on broadcast_emails (status, created_at desc);
create index if not exists idx_broadcast_email_batches_campaign_status_seq on broadcast_email_batches (broadcast_email_id, status, sequence_no);
create index if not exists idx_broadcast_email_batches_status_claim on broadcast_email_batches (status, claim_expires_at);
create index if not exists idx_broadcast_email_recipients_campaign_batch_status on broadcast_email_recipients (broadcast_email_id, batch_id, status);
create unique index if not exists idx_broadcast_email_recipients_provider_message_id on broadcast_email_recipients (provider_message_id) where provider_message_id is not null;

create or replace view verification_status as
select
  p.id as profile_id,
  p.mobile_verified,
  p.email_verified,
  (p.membership_id is not null and p.full_name is not null and p.email is not null and p.current_mobile is not null and p.address1 is not null and p.city is not null and p.pincode is not null) as profile_confirmed,
  exists(select 1 from member_documents d where d.profile_id = p.id and d.document_type = 'selfie') as selfie_uploaded,
  exists(select 1 from member_documents d where d.profile_id = p.id and d.document_type = 'document') as document_uploaded
from profiles p;

create or replace view member_verification_summary as
with selfie_docs as (
  select profile_id, true as selfie_uploaded
  from member_documents
  where document_type = 'selfie'
  group by profile_id
),
shared_mobile_groups as (
  select current_mobile as mobile, count(*) as shared_mobile_count
  from profiles
  where current_mobile is not null and current_mobile <> ''
  group by current_mobile
),
mobile_owners as (
  select mobile, profile_id as owner_profile_id
  from mobile_login_owners
)
select
  p.id as profile_id,
  p.membership_id,
  p.full_name,
  p.current_mobile,
  p.email,
  p.mobile_verified,
  p.email_verified,
  coalesce(sd.selfie_uploaded, false) as selfie_uploaded,
  (p.membership_id is not null and p.full_name is not null and p.email is not null and p.current_mobile is not null) as profile_complete,
  coalesce(smg.shared_mobile_count, 0) as shared_mobile_count,
  mo.owner_profile_id,
  case when mo.owner_profile_id = p.id then true else false end as is_mobile_login_owner,
  case
    when coalesce(smg.shared_mobile_count, 0) > 1 and mo.owner_profile_id is distinct from p.id then true
    else false
  end as shared_mobile_pending,
  (
    p.mobile_verified
    and p.email_verified
    and coalesce(sd.selfie_uploaded, false)
    and (p.membership_id is not null and p.full_name is not null and p.email is not null and p.current_mobile is not null)
    and not (
      coalesce(smg.shared_mobile_count, 0) > 1 and mo.owner_profile_id is distinct from p.id
    )
  ) as completed
from profiles p
left join selfie_docs sd on sd.profile_id = p.id
left join shared_mobile_groups smg on smg.mobile = p.current_mobile
left join mobile_owners mo on mo.mobile = p.current_mobile;
