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
