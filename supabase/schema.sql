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
