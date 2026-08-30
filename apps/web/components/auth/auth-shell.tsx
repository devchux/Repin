import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      <section className="flex min-h-[100dvh] flex-col px-6 py-6 sm:px-10 lg:px-12">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Repin home"
        >
          <Image
            src="/images/repin-logo-icon.png"
            alt=""
            width={32}
            height={32}
            className="size-8 object-contain"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">Repin</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
          By continuing, you agree to Repin&apos;s Terms and Privacy Policy.
        </p>
      </section>

      <aside className="relative hidden overflow-hidden bg-muted lg:block">
        <Image
          src="/images/auth-workspace.png"
          alt="Connected notes and web pages arranged in a calm workspace"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="max-w-md text-2xl font-medium leading-snug tracking-tight">
            Keep what matters from the web, then find it when you need it.
          </p>
        </div>
      </aside>
    </main>
  );
}
