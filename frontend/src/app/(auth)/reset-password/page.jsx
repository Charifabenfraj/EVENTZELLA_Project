"use client";

import LogoMark from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get("token") || "";
  const [token, setToken] = useState(presetToken);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Reset failed");
      }
      setStatus("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err.message || "Reset failed");
    }
  };

  return (
    <Card>
      <div className="mb-6 flex justify-center">
        <LogoMark className="h-16 w-16" />
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Secure reset</p>
        <h2 className="font-display text-2xl text-foreground">Set a new password</h2>
        <p className="text-sm text-muted-foreground">
          Confirm your reset token and choose a stronger password.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Reset token</label>
          <Input value={token} onChange={(event) => setToken(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">New password</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {status && <p className="text-sm text-success">{status}</p>}

        <Button type="submit" className="w-full">
          Update password
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
