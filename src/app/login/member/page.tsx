import { MemberLoginForm } from "@/components/auth/member-login-form";

export default function MemberLoginPage() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="shell-panel rounded-[30px] p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-rose-700">Member portal</p>
          <h1 className="mt-4 text-3xl font-semibold md:text-5xl">Login with membership ID or registered mobile</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            Every member login is verified with a WhatsApp OTP. Once you sign in, you can review household-linked numbers, update your profile, and upload the required verification files.
          </p>
          <div className="mt-6 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p>1. Enter your membership ID or current club mobile number.</p>
            <p>2. Verify the OTP sent on WhatsApp.</p>
            <p>3. Complete your profile, uploads, and linked member cleanup.</p>
          </div>
        </section>

        <section className="soft-card rounded-[30px] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Request OTP</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use any member already present in the sample data. Demo mode shows the OTP on the next screen if API keys are not configured.</p>
          <div className="mt-6">
            <MemberLoginForm />
          </div>
        </section>
      </div>
    </div>
  );
}
