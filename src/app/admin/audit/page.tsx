import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { listAuditLogs, listMembersWithVerification } from "@/lib/data";

export default async function AdminAuditPage() {
  const audits = await listAuditLogs();
  const members = await listMembersWithVerification();
  const memberMap = new Map(
    members.map((member) => [
      member.id,
      {
        memberName: member.fullName,
        membershipId: member.membershipId,
        mobile: member.currentMobile,
      },
    ]),
  );

  const items = audits.map((entry) => {
    const target = memberMap.get(entry.targetProfileId);
    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      createdAt: entry.createdAt,
      targetProfileId: entry.targetProfileId,
      memberName: target?.memberName ?? "Unknown member",
      membershipId: target?.membershipId ?? entry.targetProfileId,
      mobile: target?.mobile ?? "",
    };
  });

  return <AdminAuditHistory items={items} />;
}
