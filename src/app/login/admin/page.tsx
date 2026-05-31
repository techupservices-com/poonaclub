import { AdminLoginForm } from "@/components/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="shell-panel relative overflow-hidden rounded-[34px] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(220,38,38,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,244,238,0.88))]" />
          <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-[#b9c8ea]/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-amber-200/35 blur-3xl" />

          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#3c589e]">Poona Club admin access</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">Private admin sign in</h1>
            <p className="mt-5 text-base leading-7 text-[var(--muted)] md:text-lg">
              The admin portal is designed for member record management, verification review, and responsive card and list browsing without manual verification overrides.
            </p>
            <div className="mt-8 grid gap-3">
              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member search</span>
                <p className="mt-2 leading-6">Quickly locate records using names, membership IDs, and mobile numbers from one admin directory.</p>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">System-driven review</span>
                <p className="mt-2 leading-6">Admins can edit member details and inspect uploads, while final verification state remains controlled only by the system.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="soft-card rounded-[34px] border-white/70 bg-white/88 p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3c589e]">Admin login</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Access the control room</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Use the direct admin credentials shared privately for club operations and record management.</p>
          <div className="mt-6">
          <AdminLoginForm />
          </div>
        </section>
      </div>
    </div>
  );
}
