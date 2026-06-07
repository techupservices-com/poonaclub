import Image from "next/image";
import { MemberLoginForm } from "@/components/auth/member-login-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ identifier?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <section className="shell-panel relative overflow-hidden rounded-[36px] px-6 py-8 md:px-10 md:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(220,38,38,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,244,238,0.9))]" />
          <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-[#b9c8ea]/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div>
                    <Image
                      src="/poona-club-logo.png"
                      alt="The Poona Club Ltd. logo"
                      width={220}
                      height={220}
                      unoptimized
                      className="h-[96px] w-auto object-contain md:h-[112px]"
                      priority
                    />
                  </div>
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#3c589e]">
                    Primary Member Record Verification
                  </p>
                  <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--foreground)] md:text-5xl xl:text-6xl">
                    Welcome To The Poona Club Ltd. Member Profile Updation Portal
                  </h1>
                </div>

                <div className="max-w-3xl space-y-4 text-sm leading-7 text-[var(--muted)] md:text-base">
                  <p>
                    This secure member portal has been created for the updation and verification of
                    Primary Member records for voting purposes only.
                  </p>
                  <p>
                    Primary Members are requested to review and update their personal details,
                    including :
                  </p>
                </div>

                <div className="soft-card max-w-3xl rounded-[28px] border-white/70 bg-white/88 p-5 md:p-6">
                  <ul className="grid gap-3 text-sm leading-6 text-[var(--foreground)] md:text-base">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3c589e]" />
                      <span>Mobile Number</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3c589e]" />
                      <span>Email Address</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3c589e]" />
                      <span>Latest Selfie Photograph</span>
                    </li>
                  </ul>
                </div>

                <div className="max-w-3xl space-y-4 text-sm leading-7 text-[var(--muted)] md:text-base">
                  <p>
                    Accurate and updated records will help ensure a smooth, secure, transparent, and
                    efficient voting process.
                  </p>
                </div>

                <div className="max-w-3xl rounded-[24px] border border-[#c8d3ea] bg-[#eef2fb] px-5 py-4 text-sm font-semibold leading-6 text-[#24345f] md:text-base">
                  Please complete the profile updation and verification process on or before 1st July
                  2026.
                </div>

                <div className="max-w-3xl space-y-4 text-sm leading-7 text-[var(--muted)] md:text-base">
                  <p>
                    We thank you for your cooperation and support in helping us maintain an accurate
                    and updated member database.
                  </p>
                  <p className="font-semibold text-[var(--foreground)]">The Poona Club Ltd.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3">
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 01</span>
                  <p className="mt-2 leading-6">Verify your mobile number using SMS or WhatsApp OTP.</p>
                </div>
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 02</span>
                  <p className="mt-2 leading-6">Verify your email address using the OTP sent to your inbox.</p>
                </div>
                <div className="soft-card rounded-[24px] border-white/70 bg-white/85 px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 03</span>
                  <p className="mt-2 leading-6">Upload your selfie for record verification.</p>
                </div>
              </div>

              <section className="soft-card rounded-[30px] border-white/70 bg-white/88 p-6 md:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3c589e]">Request OTP</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Access your account</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Enter your registered mobile number or email address to receive your OTP and continue with the verification process.</p>
                <div className="mt-6">
                  <MemberLoginForm initialIdentifier={params.identifier ?? ""} />
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
