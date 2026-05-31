import { redirect } from "next/navigation";
import { PortalShell } from "@/components/shared/portal-shell";
import { getMemberSession } from "@/lib/auth";

const nav: { href: string; label: string }[] = [];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getMemberSession();
  if (!session) redirect("/login/member");

  return (
    <PortalShell
      title="Member verification"
      subtitle="Complete the remaining steps below to finish your club verification. Each card tells you exactly what is done and what still needs your action."
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
