import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i)] = line.slice(i + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DB_BATCH_SIZE = 1000;

function normalizeMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.slice(-10) : null;
}

function buildPublicSelfieUrl(filePath) {
  if (!filePath) return null;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/member-selfies/${filePath}`;
}

function computeProfileComplete(profile) {
  return Boolean(profile.membership_id && profile.full_name && profile.email && profile.current_mobile);
}

async function buildSnapshot(profile) {
  const normalizedMobile = normalizeMobile(profile.current_mobile ?? '');
  const [selfieRes, sharedRes, ownerRes] = await Promise.all([
    supabase.from('member_documents').select('id,file_path').eq('profile_id', profile.id).eq('document_type', 'selfie').limit(1).maybeSingle(),
    normalizedMobile
      ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('current_mobile', normalizedMobile)
      : Promise.resolve({ count: 0, error: null }),
    normalizedMobile
      ? supabase.from('mobile_login_owners').select('profile_id').eq('mobile', normalizedMobile).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (selfieRes.error) throw selfieRes.error;
  if (sharedRes.error) throw sharedRes.error;
  if (ownerRes.error) throw ownerRes.error;

  const selfieUploaded = Boolean(selfieRes.data);
  const profileComplete = computeProfileComplete(profile);
  const sharedMobileCount = sharedRes.count ?? 0;
  const ownerProfileId = ownerRes.data?.profile_id ?? null;
  const isMobileLoginOwner = ownerProfileId === profile.id;
  const sharedMobilePending = sharedMobileCount > 1 && ownerProfileId !== profile.id;
  const completed = Boolean(profile.mobile_verified) && Boolean(profile.email_verified) && selfieUploaded && profileComplete && !sharedMobilePending;

  return {
    profile_id: profile.id,
    membership_id: profile.membership_id,
    full_name: profile.full_name,
    member_type: profile.member_type,
    status: profile.status,
    current_mobile: profile.current_mobile,
    email: profile.email,
    mobile_verified: Boolean(profile.mobile_verified),
    email_verified: Boolean(profile.email_verified),
    selfie_uploaded: selfieUploaded,
    profile_complete: profileComplete,
    shared_mobile_count: sharedMobileCount,
    owner_profile_id: ownerProfileId,
    is_mobile_login_owner: isMobileLoginOwner,
    shared_mobile_pending: sharedMobilePending,
    completed,
    photo_public_url: buildPublicSelfieUrl(profile.photo_url ?? (selfieRes.data?.file_path ?? null)),
    updated_at: new Date().toISOString(),
  };
}

const profiles = [];
for (let from = 0; ; from += DB_BATCH_SIZE) {
  const { data, error } = await supabase.from('profiles').select('*').range(from, from + DB_BATCH_SIZE - 1);
  if (error) throw error;
  const batch = data ?? [];
  profiles.push(...batch);
  if (batch.length < DB_BATCH_SIZE) break;
}

let processed = 0;
for (const profile of profiles) {
  const row = await buildSnapshot(profile);
  const upsertRes = await supabase.from('member_verification_snapshot').upsert(row, { onConflict: 'profile_id' });
  if (upsertRes.error) throw upsertRes.error;
  processed += 1;
  if (processed % 250 === 0) {
    console.log(`Processed ${processed}`);
  }
}

console.log(`Finished rebuilding ${processed} verification snapshot rows.`);
