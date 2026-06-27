import * as xlsx from "xlsx";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getProfilePhotoPublicUrl, getSelectedProfileRows } from "@/lib/services/admin-export-service";

const filterSchema = z.enum(["verified", "approved", "disapproved", "shared", "inprogress", "notstarted"]);
const schema = z.object({
  selectionMode: z.enum(["selected_ids", "all_filtered"]),
  selectedIds: z.array(z.string().uuid()).optional(),
  query: z.string().optional(),
  filters: z.array(filterSchema).optional(),
});

const HEADERS = [
  "Sr No.",
  "Member ID",
  "Member Prefix",
  "Member Name",
  "Member Type",
  "Mobile  No.",
  "Email",
  "Status",
  "Date of Birth",
  "Birth Year",
  "Current Year",
  "Current Age",
  "Date of Joining",
  "Member Since Year",
  "Member since",
  "Photo",
  "Address1",
  "Address2",
  "Address3",
  "City",
  "Pincode",
];

function yearFromDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.getFullYear();
}

function yearsSince(value: string | null, currentYear: number) {
  const year = yearFromDate(value);
  return typeof year === "number" ? currentYear - year : "";
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.parse(await request.json());
    const profiles = await getSelectedProfileRows(body);
    const currentYear = new Date().getFullYear();

    const rows = profiles.map((profile, index) => {
      const birthYear = yearFromDate(profile.date_of_birth);
      const joinedYear = yearFromDate(profile.joined_at);
      return [
        index + 1,
        profile.membership_id,
        profile.prefix ?? "",
        profile.full_name,
        profile.member_type ?? "",
        profile.current_mobile ?? "",
        profile.email ?? "",
        profile.status ?? "",
        profile.date_of_birth ?? "",
        birthYear,
        currentYear,
        typeof birthYear === "number" ? currentYear - birthYear : "",
        profile.joined_at ?? "",
        joinedYear,
        yearsSince(profile.joined_at, currentYear),
        getProfilePhotoPublicUrl(profile),
        profile.address1 ?? "",
        profile.address2 ?? "",
        profile.address3 ?? "",
        profile.city ?? "",
        profile.pincode ?? "",
      ];
    });

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([HEADERS, ...rows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet of mobile no. Okay email ");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="poona-club-members-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("admin-member-excel-export-failed", error);
    return Response.json({ error: "Unable to prepare Excel download." }, { status: 500 });
  }
}
