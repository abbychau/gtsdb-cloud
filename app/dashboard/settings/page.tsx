"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { useInstances } from "@/hooks/use-instances";

export default function SettingsPage() {
  const { user, signOut, enterDemo } = useAuth();
  const router = useRouter();
  const { plan } = useInstances();

  const initials = (user?.displayName || user?.email || user?.uid || "?")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.replace("/");
  }

  async function handleResetDemo() {
    await signOut();
    await enterDemo();
    toast.success("Fresh demo session started");
    router.replace("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and session.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserRound className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {user?.photoURL ? (
                <AvatarImage src={user.photoURL} alt={user.displayName || ""} />
              ) : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 font-semibold">
                {user?.displayName || "Account"}
                {user?.provider === "demo" ? (
                  <Badge variant="secondary">Demo mode</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Firebase
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.email || user?.uid}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current plan</span>
            <PlanBadge plan={plan} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{user?.uid}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sign-in provider</span>
            <span className="capitalize">{user?.provider}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Session</CardTitle>
          <CardDescription>
            {user?.provider === "demo"
              ? "You're using a local demo session stored in this browser."
              : "Signed in with your Firebase account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
          {user?.provider === "demo" && (
            <Button variant="ghost" onClick={handleResetDemo}>
              Start a fresh demo session
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
