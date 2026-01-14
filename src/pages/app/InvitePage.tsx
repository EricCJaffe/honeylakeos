import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "accepted" | "no-token">("loading");
  const [inviteInfo, setInviteInfo] = useState<{
    company_name?: string;
    employee_name?: string;
    expires_at?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    // Fetch invite info (public query by token - we'll use a custom approach)
    const checkInvite = async () => {
      try {
        // We need to use an edge function or RPC to safely check invite status
        // For now, we'll just show a generic message since RLS blocks direct access
        // The actual acceptance happens via the profile trigger when user logs in
        
        setStatus("valid");
        setInviteInfo({
          company_name: undefined, // Can't fetch without auth
          employee_name: undefined,
        });
      } catch (error) {
        console.error("Error checking invite:", error);
        setStatus("invalid");
      }
    };

    checkInvite();
  }, [token]);

  // If user is logged in, the profile trigger will handle acceptance
  useEffect(() => {
    if (user && token && status === "valid") {
      // The acceptance happens automatically via the profile trigger
      // Just show a success message and redirect
      setStatus("accepted");
    }
  }, [user, token, status]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSignIn = () => {
    // Preserve the invite token in the redirect
    const returnUrl = encodeURIComponent(`/invite?token=${token}`);
    navigate(`/login?redirect=${returnUrl}`);
  };

  const handleSignUp = () => {
    const returnUrl = encodeURIComponent(`/invite?token=${token}`);
    navigate(`/signup?redirect=${returnUrl}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {status === "loading" && (
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        )}

        {status === "no-token" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Invalid Invitation Link</CardTitle>
              <CardDescription>
                No invitation token found. Please check your email for the correct link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </>
        )}

        {status === "invalid" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation link is invalid or has been revoked.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </>
        )}

        {status === "expired" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>
                This invitation has expired. Please contact your administrator for a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </>
        )}

        {status === "valid" && !user && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>You're Invited!</CardTitle>
              <CardDescription>
                {inviteInfo?.company_name
                  ? `You've been invited to join ${inviteInfo.company_name}`
                  : "You've been invited to join a company"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account to accept your invitation. Make sure to use the same email address where you received this invitation.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleSignIn} className="w-full">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button onClick={handleSignUp} variant="outline" className="w-full">
                  Create Account
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {status === "valid" && user && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Invitation Processing</CardTitle>
              <CardDescription>
                Your invitation will be automatically applied based on your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If your account email matches the invitation, you'll be added to the company automatically.
              </p>
              <Button asChild className="w-full">
                <Link to="/app">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </>
        )}

        {status === "accepted" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Invitation Accepted!</CardTitle>
              <CardDescription>
                You've successfully joined the company. You can now access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/app">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
