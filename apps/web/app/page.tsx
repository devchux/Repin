import { Button } from "@repo/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-xl rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <p className="mb-3 text-sm font-medium text-primary">Repin AI</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          The web workspace is ready.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tailwind CSS and shared shadcn components are now configured for the
          Repin web application.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
