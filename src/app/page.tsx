import Link from "next/link";
import { ShieldCheck, Smartphone, Users2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <section className="shell-panel relative overflow-hidden rounded-[36px] px-6 py-8 md:px-10 md:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(220,38,38,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,244,238,0.9))]" />
          <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-[#b9c8ea]/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#3c589e]">Welcome to Poona Club</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--foreground)] md:text-7xl">
                POONACLUB
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                A secure member portal for profile completion, mobile number verification, and a cleaner family account structure across the club.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link href="/login/member" className="rounded-full bg-[#3c589e] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(220,38,38,0.24)] hover:-translate-y-0.5 hover:bg-[#2f467e]">
                  Member login
                </Link>
                <p className="text-sm text-[var(--muted)]">Quick, secure WhatsApp OTP access for every member.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <div className="soft-card rounded-[28px] border-white/70 bg-white/85 p-5">
                <div className="flex items-center gap-3 text-[#3c589e]"><ShieldCheck className="h-5 w-5" /><span className="font-medium">System-driven verification</span></div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Verified only when mobile OTP, profile fields, selfie, and document all exist.</p>
              </div>
              <div className="soft-card rounded-[28px] border-white/70 bg-white/85 p-5">
                <div className="flex items-center gap-3 text-[#3c589e]"><Smartphone className="h-5 w-5" /><span className="font-medium">WhatsApp OTP on every login</span></div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Members sign in with membership ID or mobile number and re-verify every 24 hours.</p>
              </div>
              <div className="soft-card rounded-[28px] border-white/70 bg-white/85 p-5">
                <div className="flex items-center gap-3 text-[#3c589e]"><Users2 className="h-5 w-5" /><span className="font-medium">Household cleanup</span></div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Same-mobile groups are surfaced immediately so each family member can get a unique verified number.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
