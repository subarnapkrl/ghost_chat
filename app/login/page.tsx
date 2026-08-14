"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

import {
  RiArrowRightLine,
  RiErrorWarningLine,
  RiLoader2Line,
  RiLockPasswordLine,
  RiMailLine,
  RiTerminalBoxLine,
} from "@remixicon/react";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        const errorMsg = "Invalid email or password";
        setError(errorMsg);
        toast.error("Authentication Failed", { description: errorMsg });
        setLoading(false);
        return;
      }

      toast.success("Access Granted", {
        description: "Redirecting to terminal...",
      });
      router.push(callbackUrl);
      router.refresh();
    } catch {
      const fallbackMsg = "Something went wrong. Please try again.";
      setError(fallbackMsg);
      toast.error("Error", { description: fallbackMsg });
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative font-mono overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.28_0.04_135/0.1)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.28_0.04_135/0.1)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-0">
        <div className="bg-card border border-border border-b-0 rounded-t-sm px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiTerminalBoxLine className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs tracking-wider uppercase font-bold text-primary">
              Ghost_Chat // AUTH_GATE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive/80" />
            <span className="w-2 h-2 rounded-full bg-chart-3/80" />
            <span className="w-2 h-2 rounded-full bg-primary/80" />
          </div>
        </div>

        <Card className="rounded-t-none border-t-0 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <span className="text-primary">&gt;</span> AUTHENTICATE
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter clearance credentials to bypass quarantine perimeter.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive-foreground p-3 rounded-sm flex items-start gap-2.5 text-xs">
                <RiErrorWarningLine className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-destructive">
                    CRITICAL_ERROR
                  </span>
                  {error}
                </div>
              </div>
            )}

            <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  USER_IDENTIFIER [EMAIL]
                </Label>
                <div className="relative">
                  <RiMailLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="survivor@outpost.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  CLEARANCE_KEY [PASSWORD]
                </Label>
                <div className="relative">
                  <RiLockPasswordLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 text-xs uppercase tracking-widest font-bold group shadow-[0_0_15px_oklch(0.75_0.22_135/0.25)]"
              >
                {loading ? (
                  <span>INITIALIZING_SESSION...</span>
                ) : (
                  <>
                    <span>GRANT ACCESS</span>
                    <RiArrowRightLine className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">
              Unregistered operative?
            </span>
            <Link
              href="/register"
              className="text-primary hover:underline font-bold uppercase tracking-wider"
            >
              REGISTER_ID &rarr;
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <RiLoader2Line className="h-4 w-4 animate-spin text-emerald-500" />
            Loading terminal...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
