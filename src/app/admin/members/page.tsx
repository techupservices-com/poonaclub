import { MemberDirectory } from "@/components/admin/member-directory";
import { listMembersWithVerification } from "@/lib/data";

export default async function AdminMembersPage() {
  return <MemberDirectory members={await listMembersWithVerification()} />;
}
