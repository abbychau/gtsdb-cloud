"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chrome, FlaskConical, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirebaseError } from "@/lib/firebase-errors";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { user, loading, firebaseConfigured, signInWithEmail, signInWithGoogle, enterDemo } =
    useAuth();
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"email" | "google" | "demo" | null>(null);

  React.useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      await signInWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDemo() {
    setError(null);
    setBusy("demo");
    try {
      await enterDemo();
      router.replace("/dashboard");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your GTSDB Cloud account.">
      <div className="space-y-4">
        {!firebaseConfigured && (
          <Alert variant="default">
            <AlertDescription className="text-xs">
              Firebase isn&apos;t configured yet (see <code>.env.local.example</code>).
              You can still explore with a local demo session below.
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy !== null || !firebaseConfigured}
          onClick={handleGoogle}
        >
          {busy === "google" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or with email</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy !== null || !firebaseConfigured}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy !== null || !firebaseConfigured}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={busy !== null || !firebaseConfigured}
          >
            {busy === "email" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sign in
          </Button>
        </form>

        <Separator />

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy !== null}
          onClick={handleDemo}
        >
          <FlaskConical className="mr-2 h-4 w-4" />
          Explore with a local demo session
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          New to GTSDB Cloud?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
