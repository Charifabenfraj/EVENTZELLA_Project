"use client";

import LogoMark from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setResetToken("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }
      setStatus(data.message || "Reset instructions sent.");
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err) {
      setError(err.message || "Request failed");
    }
  };

  return (
    <Card>
      <div className="mb-6 flex justify-center">
        <LogoMark className="h-16 w-16" />
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account recovery</p>
        <h2 className="font-display text-2xl text-foreground">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a secure reset link.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@eventzella.com"
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {status && <p className="text-sm text-success">{status}</p>}
        {resetToken && (
          <p className="rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
            Dev token: {resetToken}
          </p>
        )}

        <Button type="submit" className="w-full">
          Send reset instructions
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-foreground">
            Back to login
          </Link>
        </p>
      </form>
    </Card>
  );
}
