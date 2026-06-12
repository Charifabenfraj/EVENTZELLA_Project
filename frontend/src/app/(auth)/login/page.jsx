"use client";

import LogoMark from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push(`/dashboard/${data.user?.role || "ceo"}`);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Google login failed");
        }

        router.push(`/dashboard/${data.user?.role || "ceo"}`);
      } catch (err) {
        setError(err.message || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login failed"),
  });

  return (
    <Card className="max-w-md mx-auto p-8 shadow-2xl border border-border/50 backdrop-blur-xl bg-card/80">
      <div className="space-y-4 text-center">
        <LogoMark className="mx-auto h-20 w-20" />
        <h2 className="font-display text-3xl font-bold text-foreground">Accès Entreprise</h2>
        <p className="text-sm text-muted-foreground px-4">
          Connectez-vous pour accéder à votre espace d'intelligence décisionnelle.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-3 py-6 border-border hover:bg-muted transition-all"
          onClick={() => handleGoogleLogin()}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="font-semibold">Continuer avec Google</span>
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-4 text-muted-foreground">Ou avec email</span>
          </div>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold ml-1">Email professionnel</label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ceo@eventzella.com"
            className="h-12 bg-muted/30"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold ml-1">Mot de passe</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="h-12 bg-muted/30"
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
            <p className="text-xs text-danger font-medium">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-bold rounded-xl shadow-lg shadow-brand/20 transition-all" disabled={loading}>
          {loading ? "Authentification..." : "Se connecter"}
        </Button>

        <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <Link href="/forgot-password" title="Réinitialiser" className="hover:text-brand transition-colors">
            Mot de passe oublié ?
          </Link>
          <Link href="/signup" title="Inscription" className="hover:text-brand transition-colors">
            Créer un compte
          </Link>
        </div>
      </form>
    </Card>
  );
}
