import { Suspense } from "react";
import { MemberOtpForm } from "@/components/auth/member-otp-form";

export default function MemberVerifyPage() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="shell-panel relative overflow-hidden rounded-[34px] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(220,38,38,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,244,238,0.88))]" />
          <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-rose-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-amber-200/35 blur-3xl" />

          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-rose-700">Poona Club member portal</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">Confirm your login</h1>
            <p className="mt-5 text-base leading-7 text-[var(--muted)] md:text-lg">
              Enter the WhatsApp authentication code to continue securely into your member account.
            </p>
            <div className="mt-8 grid gap-3">
              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Session window</span>
                <p className="mt-2 leading-6">Once verified, your member session remains active for one day before another OTP is required.</p>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Security check</span>
                <p className="mt-2 leading-6">Use the exact 6-digit code received on WhatsApp for the registered number.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="soft-card rounded-[34px] border-white/70 bg-white/88 p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-rose-700">Verify OTP</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Enter your 6-digit code</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">If you are using demo mode, the preview code from the previous screen can be used here directly.</p>
          <div className="mt-6">
            <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading verification form...</p>}>
              <MemberOtpForm />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
