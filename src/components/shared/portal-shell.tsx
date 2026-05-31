"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

export function PortalShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="shell-panel rounded-[28px] px-5 py-5 md:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3c589e]">
                {APP_NAME}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
                {subtitle}
              </p>
            </div>

            {nav.length ? (
              <nav className="flex flex-wrap gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium",
                      pathname === item.href
                        ? "border-[#6f84ba] bg-[#3c589e] text-white shadow-sm"
                        : "border-[var(--border)] bg-white/80 text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </header>

        <main className="grid gap-6">{children}</main>
      </div>
    </div>
  );
}
