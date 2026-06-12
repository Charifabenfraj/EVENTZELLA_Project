"use client";

import LogoMark from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "business",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      router.push(`/dashboard/${data.user?.role || "ceo"}`);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-6 flex justify-center">
        <LogoMark className="h-16 w-16" />
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Enterprise onboarding</p>
        <h2 className="font-display text-2xl text-foreground">Create your workspace</h2>
        <p className="text-sm text-muted-foreground">
          Register a decision-maker account for secure dashboard access.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">First name</label>
            <Input
              value={form.firstName}
              onChange={(event) => onChange("firstName", event.target.value)}
              placeholder="Amina"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last name</label>
            <Input
              value={form.lastName}
              onChange={(event) => onChange("lastName", event.target.value)}
              placeholder="Ben Said"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="leader@eventzella.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            placeholder="At least 10 characters"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <Select value={form.role} onChange={(event) => onChange("role", event.target.value)}>
            <option value="ceo">CEO</option>
            <option value="quality">Quality Manager</option>
            <option value="business">Business Manager</option>
            <option value="marketing">Marketing Manager</option>
          </Select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-foreground">
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
