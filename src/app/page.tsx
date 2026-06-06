import { MemberLoginForm } from "@/components/auth/member-login-form";

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <section className="shell-panel relative overflow-hidden rounded-[36px] px-6 py-8 md:px-10 md:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(220,38,38,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,244,238,0.9))]" />
          <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-[#b9c8ea]/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#3c589e]">Welcome to Poona Club</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--foreground)] md:text-7xl">
                POONACLUB
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                A secure member portal for profile completion, mobile number verification, and a cleaner family account structure across the club.
              </p>
              <div className="mt-7">
                <p className="text-sm text-[var(--muted)]">Quick, secure WhatsApp OTP access for every member.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3">
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 01</span>
                  <p className="mt-2 leading-6">Enter your membership ID or current club mobile number.</p>
                </div>
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 02</span>
                  <p className="mt-2 leading-6">Verify the OTP sent to your WhatsApp number.</p>
                </div>
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 03</span>
                  <p className="mt-2 leading-6">Complete your profile, uploads, and linked member cleanup.</p>
                </div>
              </div>

              <section className="soft-card rounded-[30px] border-white/70 bg-white/88 p-6 md:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3c589e]">Request OTP</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Access your account</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Use your existing club membership details. In demo mode, the OTP appears on the next screen if live API keys are not configured.</p>
                <div className="mt-6">
                  <MemberLoginForm />
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
