import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteInfo {
  status: string;
  expires_at: string;
  employee_name: string;
  company_name: string;
}

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token");

  const [pageStatus, setPageStatus] = useState<
    "loading" | "valid" | "invalid" | "expired" | "accepted" | "no-token" | "accepting" | "email-mismatch"
  >("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch invite info when token changes
  useEffect(() => {
    if (!token) {
      setPageStatus("no-token");
      return;
    }

    const checkInvite = async () => {
      try {
        setPageStatus("loading");

        // Call public RPC to get invite info
        const { data, error } = await supabase.rpc("get_employee_invite_public", {
          p_token: token,
        });

        if (error) {
          console.error("Error checking invite:", error);
          setPageStatus("invalid");
          return;
        }

        // RPC returns array, check if we got a result
        if (!data || data.length === 0) {
          setPageStatus("invalid");
          return;
        }

        const invite = data[0] as InviteInfo;

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
          setPageStatus("expired");
          setInviteInfo(invite);
          return;
        }

        setInviteInfo(invite);
        setPageStatus("valid");
      } catch (error) {
        console.error("Error checking invite:", error);
        setPageStatus("invalid");
      }
    };

    checkInvite();
  }, [token]);

  // When user is logged in and invite is valid, attempt to accept
  useEffect(() => {
    if (!user || !token || pageStatus !== "valid") return;

    const acceptInvite = async () => {
      setPageStatus("accepting");

      try {
        const { data, error } = await supabase.rpc("accept_employee_invite", {
          p_token: token,
        });

        if (error) {
          console.error("Error accepting invite:", error);
          setAcceptError(error.message);
          setPageStatus("invalid");
          return;
        }

        const result = data as { success: boolean; error?: string; company_id?: string };

        if (!result.success) {
          if (result.error?.includes("Email does not match")) {
            setPageStatus("email-mismatch");
            setAcceptError(result.error);
          } else {
            setAcceptError(result.error || "Failed to accept invitation");
            setPageStatus("invalid");
          }
          return;
        }

        toast.success("Invitation accepted successfully!");
        setPageStatus("accepted");
      } catch (error: any) {
        console.error("Error accepting invite:", error);
        setAcceptError(error.message);
        setPageStatus("invalid");
      }
    };

    acceptInvite();
  }, [user, token, pageStatus]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSignIn = () => {
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
        {/* Loading */}
        {(pageStatus === "loading" || pageStatus === "accepting") && (
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {pageStatus === "accepting" ? "Accepting invitation..." : "Checking invitation..."}
            </p>
          </CardContent>
        )}

        {/* No Token */}
        {pageStatus === "no-token" && (
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

        {/* Invalid */}
        {pageStatus === "invalid" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                {acceptError || "This invitation link is invalid, has been revoked, or has already been used."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </>
        )}

        {/* Expired */}
        {pageStatus === "expired" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>
                This invitation expired on{" "}
                {inviteInfo?.expires_at
                  ? new Date(inviteInfo.expires_at).toLocaleDateString()
                  : "an unknown date"}
                . Please contact your administrator for a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </>
        )}

        {/* Email Mismatch */}
        {pageStatus === "email-mismatch" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Email Mismatch</CardTitle>
              <CardDescription>
                This invitation was sent to a different email address. Please sign in with the email address
                where you received this invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Expected email: <strong>{inviteInfo?.employee_name}</strong>'s invitation to{" "}
                <strong>{inviteInfo?.company_name}</strong>
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleSignIn}>
                  Sign in with different account
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/">Go to Home</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Valid - Not Logged In */}
        {pageStatus === "valid" && !user && (
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
              {inviteInfo?.employee_name && (
                <p className="text-sm text-center">
                  Welcome, <strong>{inviteInfo.employee_name}</strong>
                </p>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account to accept your invitation. Make sure to use the same email
                address where you received this invitation.
              </p>
              {inviteInfo?.expires_at && (
                <p className="text-xs text-muted-foreground text-center">
                  This invitation expires on{" "}
                  {new Date(inviteInfo.expires_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
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

        {/* Accepted */}
        {pageStatus === "accepted" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Invitation Accepted!</CardTitle>
              <CardDescription>
                You've successfully joined{" "}
                {inviteInfo?.company_name ? (
                  <strong>{inviteInfo.company_name}</strong>
                ) : (
                  "the company"
                )}
                . You can now access your dashboard.
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
