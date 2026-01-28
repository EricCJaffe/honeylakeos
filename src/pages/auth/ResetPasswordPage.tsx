import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function parseFragmentParams(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const { code, error, errorDescription, accessToken, refreshToken, type } = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    const frag = parseFragmentParams(window.location.hash);

    return {
      code: qs.get("code") || frag.get("code"),
      type: qs.get("type") || frag.get("type"),
      error: qs.get("error") || frag.get("error"),
      errorDescription: qs.get("error_description") || frag.get("error_description"),
      accessToken: frag.get("access_token"),
      refreshToken: frag.get("refresh_token"),
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (error) {
          toast.error(decodeURIComponent(errorDescription || error));
          setLoading(false);
          return;
        }

        // Supabase can deliver recovery in two common ways:
        // 1) PKCE: ?code=... (exchangeCodeForSession)
        // 2) Implicit: #access_token=...&refresh_token=...
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            toast.error(exErr.message);
            setLoading(false);
            return;
          }
        } else if (accessToken && refreshToken) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessErr) {
            toast.error(sessErr.message);
            setLoading(false);
            return;
          }
        } else {
          // If user landed here without tokens, prompt them to request a new recovery email.
          toast.error("Missing recovery token. Please request a new password reset email.");
          setLoading(false);
          return;
        }

        // Clean the URL so tokens/codes are not left in history.
        window.history.replaceState({}, document.title, "/auth/reset");
        setLoading(false);
      } catch (e: any) {
        toast.error(e?.message || "Failed to initialize password reset");
        setLoading(false);
      }
    })();
  }, [accessToken, code, error, errorDescription, refreshToken, type]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== password2) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated. Please sign in.");
    // Optional: sign out to force clean sign-in with new password.
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Preparing reset…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Confirm new password</Label>
              <Input
                id="password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
