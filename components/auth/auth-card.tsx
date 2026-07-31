import Link from "next/link";
import { Logo } from "@/components/layout/logo";

/** Shared centered card wrapper for the auth pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to the{" "}
            <Link href="/docs" className="underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/docs" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
