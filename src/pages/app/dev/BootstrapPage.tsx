import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Rocket, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface BootstrapResult {
  profileId?: string;
  siteId?: string;
  companyId?: string;
  membershipId?: string;
  siteMembershipId?: string;
}

export default function BootstrapPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BootstrapResult | null>(null);

  // Redirect to /app in production
  if (!import.meta.env.DEV) {
    return <Navigate to="/app" replace />;
  }

  const handleBootstrap = async () => {
    if (!user) {
      setError("No authenticated user found");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const bootstrapResult: BootstrapResult = {};

    try {
      console.log("[Bootstrap] Starting bootstrap process for user:", user.id);

      // Step 1: Check if sites table exists
      console.log("[Bootstrap] Checking if sites table exists...");
      const { error: sitesCheckError } = await supabase
        .from("sites")
        .select("id")
        .limit(1);

      if (sitesCheckError && sitesCheckError.code === "42P01") {
        throw new Error("Missing table: 'sites'. Please ensure database migrations have been run.");
      }

      // Step 2: Ensure profile exists
      console.log("[Bootstrap] Checking/creating profile...");
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("user_id, active_company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileCheckError && profileCheckError.code !== "PGRST116") {
        console.error("[Bootstrap] Profile check error:", profileCheckError);
        throw new Error(`Failed to check profile: ${profileCheckError.message}`);
      }

      if (!existingProfile) {
        console.log("[Bootstrap] Creating new profile...");
        const fullName = user.user_metadata?.full_name || user.email || "User";
        const { data: newProfile, error: profileInsertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: fullName,
          })
          .select("user_id")
          .single();

        if (profileInsertError) {
          console.error("[Bootstrap] Profile insert error:", profileInsertError);
          throw new Error(`Failed to create profile: ${profileInsertError.message}`);
        }
        bootstrapResult.profileId = newProfile.user_id;
        console.log("[Bootstrap] Profile created:", newProfile.user_id);
      } else {
        bootstrapResult.profileId = existingProfile.user_id;
        console.log("[Bootstrap] Profile already exists:", existingProfile.user_id);
      }

      // Step 3: Check existing memberships
      console.log("[Bootstrap] Checking existing memberships...");
      const { data: existingMemberships, error: membershipCheckError } = await supabase
        .from("memberships")
        .select("id, company_id")
        .eq("user_id", user.id);

      if (membershipCheckError) {
        console.error("[Bootstrap] Membership check error:", membershipCheckError);
        throw new Error(`Failed to check memberships: ${membershipCheckError.message}`);
      }

      if (existingMemberships && existingMemberships.length > 0) {
        console.log("[Bootstrap] User already has memberships, checking active_company_id...");
        bootstrapResult.membershipId = existingMemberships[0].id;
        bootstrapResult.companyId = existingMemberships[0].company_id;

        // If no active_company_id, set it
        if (!existingProfile?.active_company_id) {
          console.log("[Bootstrap] Setting active_company_id...");
          const { error: updateProfileError } = await supabase
            .from("profiles")
            .update({ active_company_id: existingMemberships[0].company_id })
            .eq("user_id", user.id);

          if (updateProfileError) {
            console.error("[Bootstrap] Profile update error:", updateProfileError);
            throw new Error(`Failed to update active_company_id: ${updateProfileError.message}`);
          }
        }

        setResult(bootstrapResult);
        console.log("[Bootstrap] Bootstrap complete (existing membership used):", bootstrapResult);
        return;
      }

      // Step 4: Create new site
      console.log("[Bootstrap] Creating new site...");
      const siteName = `${user.email?.split("@")[0] || "My"} Organization`;
      const { data: newSite, error: siteError } = await supabase
        .from("sites")
        .insert({
          name: siteName,
          status: "active",
        })
        .select("id")
        .single();

      if (siteError) {
        console.error("[Bootstrap] Site creation error:", siteError);
        throw new Error(`Failed to create site: ${siteError.message}`);
      }
      bootstrapResult.siteId = newSite.id;
      console.log("[Bootstrap] Site created:", newSite.id);

      // Step 5: Create site_membership if table exists
      console.log("[Bootstrap] Attempting to create site_membership...");
      try {
        const { data: siteMembership, error: siteMembershipError } = await supabase
          .from("site_memberships")
          .insert({
            site_id: newSite.id,
            user_id: user.id,
            role: "super_admin",
          })
          .select("id")
          .single();

        if (siteMembershipError) {
          if (siteMembershipError.code === "42P01") {
            console.log("[Bootstrap] site_memberships table does not exist, skipping...");
          } else {
            console.warn("[Bootstrap] Site membership creation warning:", siteMembershipError);
          }
        } else if (siteMembership) {
          bootstrapResult.siteMembershipId = siteMembership.id;
          console.log("[Bootstrap] Site membership created:", siteMembership.id);
        }
      } catch (smError) {
        console.log("[Bootstrap] site_memberships table access failed, skipping gracefully");
      }

      // Step 6: Create company
      console.log("[Bootstrap] Creating new company...");
      const companyName = `${user.email?.split("@")[0] || "My"} Company`;
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          site_id: newSite.id,
          status: "active",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (companyError) {
        console.error("[Bootstrap] Company creation error:", companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }
      bootstrapResult.companyId = newCompany.id;
      console.log("[Bootstrap] Company created:", newCompany.id);

      // Step 7: Create membership
      console.log("[Bootstrap] Creating membership...");
      const { data: newMembership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: user.id,
          company_id: newCompany.id,
          role: "company_admin",
          status: "active",
          member_type: "internal",
        })
        .select("id")
        .single();

      if (membershipError) {
        console.error("[Bootstrap] Membership creation error:", membershipError);
        throw new Error(`Failed to create membership: ${membershipError.message}`);
      }
      bootstrapResult.membershipId = newMembership.id;
      console.log("[Bootstrap] Membership created:", newMembership.id);

      // Step 8: Update profile with active_company_id
      console.log("[Bootstrap] Setting active_company_id on profile...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ active_company_id: newCompany.id })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Bootstrap] Profile update error:", updateError);
        throw new Error(`Failed to set active company: ${updateError.message}`);
      }

      setResult(bootstrapResult);
      console.log("[Bootstrap] Bootstrap complete:", bootstrapResult);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[Bootstrap] Error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <CardTitle>System Bootstrap</CardTitle>
          </div>
          <CardDescription>
            Initialize a fresh BusinessOS system with your first site, company, and admin membership.
          </CardDescription>
          <div className="mt-2 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded inline-block">
            DEV MODE ONLY
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="text-sm text-muted-foreground">
              Logged in as: <span className="font-medium text-foreground">{user.email}</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Bootstrap Complete!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                <ul className="mt-2 space-y-1 text-xs font-mono">
                  {result.profileId && <li>Profile: {result.profileId}</li>}
                  {result.siteId && <li>Site: {result.siteId}</li>}
                  {result.companyId && <li>Company: {result.companyId}</li>}
                  {result.membershipId && <li>Membership: {result.membershipId}</li>}
                  {result.siteMembershipId && <li>Site Membership: {result.siteMembershipId}</li>}
                </ul>
                <Link
                  to="/app"
                  className="mt-4 inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {!result && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bootstrapping...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Bootstrap System
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Initialize System?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new site, company, and set you up as the company administrator.
                    This action is intended for fresh system initialization only.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBootstrap}>
                    Confirm Bootstrap
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
