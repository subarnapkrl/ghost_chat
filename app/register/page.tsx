"use client";

import { signIn } from "next-auth/react";

import {
  RiArrowRightLine,
  RiErrorWarningLine,
  RiLockPasswordLine,
  RiMailLine,
  RiTerminalBoxLine,
  RiUser3Line,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chatName, setChatName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, chatName }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issue =
          data?.issues?.email ??
          data?.issues?.chatName ??
          data?.issues?.fieldErrors?.email?.[0] ??
          data?.issues?.fieldErrors?.password?.[0] ??
          data?.issues?.fieldErrors?.chatName?.[0] ??
          data?.error ??
          "Registration failed";
        setError(issue);
        toast.error("Registration Failed", {
          description: issue,
        });

        setLoading(false);
        return;
      }
      toast.success("Account created successfully!", {
        description: "Signing you in...",
      });
      const signInResponse = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResponse?.error) {
        setError("Account created - please signin");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
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
              Ghost_Chat // ID_ENROLLMENT
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
              <span className="text-primary">&gt;</span> CREATE_ID
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enroll new operative clearance into quarantine defense node.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive-foreground p-3 rounded-sm flex items-start gap-2.5 text-xs">
                <RiErrorWarningLine className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-destructive">
                    REGISTRATION_FAILED
                  </span>
                  {error}
                </div>
              </div>
            )}

            <form
              id="register-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  OPERATIVE_CODENAME [NAME]
                </Label>
                <div className="relative">
                  <RiUser3Line className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    required
                    placeholder="Unit-734"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    className="pl-9 text-xs focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  COMM_LINK [EMAIL]
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
                  SECURITY_KEY [PASSWORD]
                </Label>
                <div className="relative">
                  <RiLockPasswordLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="Min 8 characters..."
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
                  <span>ENROLLING_OPERATIVE...</span>
                ) : (
                  <>
                    <span>ESTABLISH ID</span>
                    <RiArrowRightLine className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">Already enrolled?</span>
            <Link
              href="/login"
              className="text-primary hover:underline font-bold uppercase tracking-wider"
            >
              AUTHENTICATE &rarr;
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
