import * as React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, AlertCircle, Loader2, Rocket, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isSiteAdmin, memberships, loading, refreshMemberships, siteMemberships } = useMembership();

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  // If user already has memberships, redirect to dashboard
  React.useEffect(() => {
    if (!loading && memberships.length > 0) {
      navigate("/app");
    }
  }, [loading, memberships, navigate]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step A: Find or create a site
      let siteId: string | null = null;

      // First, check if user has site memberships
      if (siteMemberships.length > 0) {
        siteId = siteMemberships[0].site_id;
      }

      // If no site membership, try to find any existing site
      if (!siteId) {
        const { data: existingSites, error: siteQueryError } = await supabase
          .from("sites")
          .select("id")
          .limit(1);

        if (!siteQueryError && existingSites && existingSites.length > 0) {
          siteId = existingSites[0].id;
        }
      }

      // If still no site, create one and make user super_admin
      if (!siteId) {
        const { data: newSite, error: createSiteError } = await supabase
          .from("sites")
          .insert({
            name: "Default Site",
            status: "active",
          })
          .select("id")
          .single();

        if (createSiteError) {
          throw new Error(`Failed to create site: ${createSiteError.message}`);
        }

        siteId = newSite.id;

        // Also create site_membership for the user as super_admin
        const { error: siteMembershipError } = await supabase
          .from("site_memberships")
          .insert({
            site_id: siteId,
            user_id: user.id,
            role: "super_admin",
          });

        if (siteMembershipError) {
          console.warn("Could not create site membership:", siteMembershipError.message);
        }
      }

      // Step B: Create the company
      const { data: newCompany, error: createCompanyError } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          description: description.trim() || null,
          site_id: siteId,
          status: "active",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (createCompanyError) {
        throw new Error(`Failed to create company: ${createCompanyError.message}`);
      }

      // Step C: Create membership for user as company_admin
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          company_id: newCompany.id,
          user_id: user.id,
          role: "company_admin",
          status: "active",
          member_type: "internal",
        });

      if (membershipError) {
        // It might already exist from a trigger
        console.warn("Could not create membership:", membershipError.message);
      }

      // Step D: Update profile with active_company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_company_id: newCompany.id })
        .eq("user_id", user.id);

      if (profileError) {
        console.warn("Could not update profile:", profileError.message);
      }

      // Invalidate queries and refresh memberships
      await queryClient.invalidateQueries();
      await refreshMemberships();

      toast.success("Company created successfully!");
      navigate("/app");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "An error occurred while creating your company");
      toast.error(err.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-border">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Create your first company</CardTitle>
            <CardDescription>
              Set up your organization to get started.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your company"
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!companyName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
            </form>

            {isDev && (
              <div className="mt-4 pt-4 border-t border-border">
                <Link to="/app/dev/bootstrap">
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                    <Rocket className="mr-2 h-4 w-4" />
                    Dev Tools → Bootstrap
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dev Debug Panel */}
        {isDev && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Dev Debug Info
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="text-xs font-mono space-y-1 text-muted-foreground">
                  <div>
                    <span className="text-foreground/70">User ID:</span>{" "}
                    {user?.id?.slice(0, 8)}...
                  </div>
                  <div>
                    <span className="text-foreground/70">Email:</span>{" "}
                    {user?.email}
                  </div>
                  <div>
                    <span className="text-foreground/70">isSuperAdmin:</span>{" "}
                    <span className={isSuperAdmin ? "text-green-500" : "text-red-500"}>
                      {String(isSuperAdmin)}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground/70">isSiteAdmin:</span>{" "}
                    <span className={isSiteAdmin ? "text-green-500" : "text-red-500"}>
                      {String(isSiteAdmin)}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground/70">Memberships:</span>{" "}
                    {memberships.length}
                  </div>
                  <div>
                    <span className="text-foreground/70">Site Memberships:</span>{" "}
                    {siteMemberships.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
