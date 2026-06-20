import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const source = process.argv[2];
const sheetNameArg = process.argv[3] ?? "";

if (!source) {
  throw new Error("Usage: node scripts/import-members-to-db.mjs <xlsx-file> [sheet-name]");
}

const env = {};
for (const line of fs.readFileSync(path.resolve(".env.local"), "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  env[line.slice(0, i)] = line.slice(i + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const workbook = xlsx.readFile(source);
const sheetName = sheetNameArg || workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  throw new Error(`Sheet not found: ${sheetName}`);
}

const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeMobile(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-10) : "";
}

function normalizePincode(value) {
  return String(value ?? "").trim().replace(/\.0$/, "");
}

function mapRow(row) {
  return {
    membership_id: normalizeText(row["Member ID"]),
    prefix: normalizeText(row["Member Prefix"]),
    full_name: normalizeText(row["Member Name"]),
    member_type: normalizeText(row["Member Type"]),
    current_mobile: normalizeMobile(row["Mobile No."] || row["Mobile  No."]),
    email: normalizeText(row["Email"]),
    status: normalizeText(row["Status"]),
    address1: normalizeText(row["Address1"]),
    address2: normalizeText(row["Address2"]),
    address3: normalizeText(row["Address3"]),
    city: normalizeText(row["City"]),
    pincode: normalizePincode(row["Pincode"]),
    photo_url: normalizeText(row["Photo"]) || null,
  };
}

function mergeProfile(existing, incoming) {
  return {
    membership_id: existing.membership_id || incoming.membership_id,
    prefix: incoming.prefix || existing.prefix || "",
    full_name: incoming.full_name || existing.full_name || "",
    member_type: incoming.member_type || existing.member_type || "",
    current_mobile: incoming.current_mobile || existing.current_mobile || "",
    email: incoming.email || existing.email || "",
    status: incoming.status || existing.status || "",
    address1: incoming.address1 || existing.address1 || "",
    address2: incoming.address2 || existing.address2 || "",
    address3: incoming.address3 || existing.address3 || "",
    city: incoming.city || existing.city || "",
    pincode: incoming.pincode || existing.pincode || "",
    photo_url: incoming.photo_url || existing.photo_url || null,
  };
}

function chunks(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

const prepared = rows.map(mapRow);
const duplicates = new Set();
const seen = new Set();
const validRows = [];
let skippedMissingMembershipId = 0;

for (const row of prepared) {
  if (!row.membership_id) {
    skippedMissingMembershipId += 1;
    continue;
  }
  if (seen.has(row.membership_id)) {
    duplicates.add(row.membership_id);
    continue;
  }
  seen.add(row.membership_id);
  validRows.push(row);
}

const membershipIds = validRows.map((row) => row.membership_id);
const existingProfiles = [];
for (const batch of chunks(membershipIds, 200)) {
  const { data, error } = await supabase.from("profiles").select("*").in("membership_id", batch);
  if (error) throw error;
  existingProfiles.push(...(data ?? []));
}

const existingByMembershipId = new Map(existingProfiles.map((profile) => [profile.membership_id, profile]));

let inserted = 0;
let updated = 0;
let unchanged = 0;
const affectedProfileIds = [];

for (const row of validRows) {
  const existing = existingByMembershipId.get(row.membership_id);

  if (!existing) {
    const payload = {
      ...row,
      role: "member",
      mobile_verified: false,
      email_verified: false,
    };
    const { data, error } = await supabase.from("profiles").insert(payload).select("id").single();
    if (error) throw error;
    inserted += 1;
    affectedProfileIds.push(data.id);
    continue;
  }

  const merged = mergeProfile(existing, row);
  const fieldsToCompare = [
    "prefix",
    "full_name",
    "member_type",
    "current_mobile",
    "email",
    "status",
    "address1",
    "address2",
    "address3",
    "city",
    "pincode",
    "photo_url",
  ];

  const hasChanges = fieldsToCompare.some((field) => (existing[field] ?? "") !== (merged[field] ?? ""));
  if (!hasChanges) {
    unchanged += 1;
    continue;
  }

  const { error } = await supabase.from("profiles").update({ ...merged, updated_at: new Date().toISOString() }).eq("id", existing.id);
  if (error) throw error;
  updated += 1;
  affectedProfileIds.push(existing.id);
}

console.log(
  JSON.stringify(
    {
      source,
      sheetName,
      totalRows: rows.length,
      validRows: validRows.length,
      skippedMissingMembershipId,
      duplicateMembershipIds: [...duplicates],
      inserted,
      updated,
      unchanged,
      affectedProfileIds,
    },
    null,
    2,
  ),
);
