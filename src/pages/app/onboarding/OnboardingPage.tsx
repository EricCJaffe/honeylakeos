import * as React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, AlertCircle, Loader2, Rocket, Info, FlaskConical, CheckCircle2, XCircle, Bug } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: string;
  companyId?: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isSiteAdmin, memberships, loading, refreshMemberships, siteMemberships } = useMembership();

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [detectedSiteId, setDetectedSiteId] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;
  const forceMode = isDev && new URLSearchParams(window.location.search).get("force") === "1";

  // If user already has memberships, redirect to dashboard (unless force mode)
  React.useEffect(() => {
    if (!loading && memberships.length > 0 && !forceMode) {
      navigate("/app");
    }
  }, [loading, memberships, navigate, forceMode]);

  // Log debug info to console
  React.useEffect(() => {
    if (isDev && user) {
      console.log("[Onboarding Debug]", {
        userId: user.id,
        email: user.email,
        membershipsCount: memberships.length,
        siteMembershipsCount: siteMemberships.length,
        isSuperAdmin,
        isSiteAdmin,
      });
    }
  }, [isDev, user, memberships, siteMemberships, isSuperAdmin, isSiteAdmin]);

  const runPlatformTests = async () => {
    if (!user) return;

    setIsTesting(true);
    setTestResults([]);
    setDetectedSiteId(null);

    const results: TestResult[] = [];

    // ===== TEST A: Get default site via RPC =====
    console.log("[Test A] Calling get_default_site_id RPC...");
    const { data: defaultSiteId, error: rpcError } = await supabase.rpc("get_default_site_id");

    if (rpcError) {
      results.push({
        name: "A) get_default_site_id RPC",
        success: false,
        message: "Failed to call get_default_site_id",
        details: `Code: ${rpcError.code}, Message: ${rpcError.message}, Hint: ${rpcError.hint || "none"}`,
      });
      console.error("[Test A] FAILED:", rpcError);
    } else if (!defaultSiteId) {
      results.push({
        name: "A) get_default_site_id RPC",
        success: false,
        message: "No active site exists",
        details: "The platform needs to be bootstrapped by an administrator first.",
      });
      console.warn("[Test A] No site found");
    } else {
      setDetectedSiteId(defaultSiteId);
      results.push({
        name: "A) get_default_site_id RPC",
        success: true,
        message: `Found site: ${defaultSiteId.slice(0, 8)}...`,
        details: `Site ID: ${defaultSiteId}`,
      });
      console.log("[Test A] SUCCESS:", defaultSiteId);
    }

    // Get siteId for subsequent tests
    const testSiteId = defaultSiteId;

    // ===== TEST B: INSERT companies (keep for Test C) =====
    let testCompanyId: string | null = null;
    let testCompanyName = "";

    if (testSiteId) {
      testCompanyName = `[TEST] Onboarding Test ${Date.now()}`;
      console.log("[Test B] Attempting to INSERT company:", testCompanyName);

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: testCompanyName,
          site_id: testSiteId,
          status: "archived", // Create as archived immediately
          created_by: user.id,
        })
        .select("id")
        .single();

      if (companyError) {
        results.push({
          name: "B) INSERT companies",
          success: false,
          message: "Failed to insert company",
          details: `Code: ${companyError.code}, Message: ${companyError.message}, Hint: ${companyError.hint || "none"}`,
        });
        console.error("[Test B] FAILED:", companyError);
      } else {
        testCompanyId = companyData.id;
        console.log("[Test B] INSERT SUCCESS, company id:", testCompanyId);

        results.push({
          name: "B) INSERT companies",
          success: true,
          message: "Insert succeeded (kept for Test C)",
          details: `Company ID: ${testCompanyId}`,
          companyId: testCompanyId,
        });
      }
    } else {
      results.push({
        name: "B) INSERT companies",
        success: false,
        message: "Skipped - no site_id available from Test A",
        details: "Cannot test company creation without a valid site.",
      });
    }

    // ===== TEST C: INSERT memberships (using same company from Test B) =====
    let testMembershipCreated = false;

    if (testCompanyId) {
      console.log("[Test C] Attempting to INSERT membership for company:", testCompanyId);

      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          company_id: testCompanyId,
          user_id: user.id,
          role: "company_admin",
          status: "active",
          member_type: "internal",
        });

      if (membershipError) {
        results.push({
          name: "C) INSERT memberships",
          success: false,
          message: "Failed to insert membership",
          details: `Code: ${membershipError.code}, Message: ${membershipError.message}, Hint: ${membershipError.hint || "none"}`,
          companyId: testCompanyId,
        });
        console.error("[Test C] FAILED:", membershipError);
      } else {
        testMembershipCreated = true;
        results.push({
          name: "C) INSERT memberships",
          success: true,
          message: "Membership insert succeeded",
          details: `Role: company_admin, Status: active, Company ID: ${testCompanyId}`,
          companyId: testCompanyId,
        });
        console.log("[Test C] SUCCESS");
      }
    } else {
      results.push({
        name: "C) INSERT memberships",
        success: false,
        message: "Skipped - no company available from Test B",
        details: "Cannot test membership creation without a valid company.",
      });
    }

    // ===== CLEANUP: Delete membership first, then company =====
    if (testCompanyId) {
      console.log("[Cleanup] Starting cleanup for company:", testCompanyId);

      // Delete membership first (if created)
      if (testMembershipCreated) {
        const { error: deleteMembershipError } = await supabase
          .from("memberships")
          .delete()
          .eq("company_id", testCompanyId)
          .eq("user_id", user.id);

        if (deleteMembershipError) {
          console.warn("[Cleanup] Membership DELETE failed:", deleteMembershipError);
        } else {
          console.log("[Cleanup] Membership deleted successfully");
        }
      }

      // Try to delete company
      const { error: deleteCompanyError } = await supabase
        .from("companies")
        .delete()
        .eq("id", testCompanyId);

      if (deleteCompanyError) {
        console.warn("[Cleanup] Company DELETE failed, trying UPDATE:", deleteCompanyError);

        // Fallback: update to archived with [CLEANUP] prefix
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            status: "archived",
            name: `[CLEANUP] ${testCompanyName}`,
          })
          .eq("id", testCompanyId);

        if (updateError) {
          console.error("[Cleanup] Company UPDATE also failed:", updateError);
          results.push({
            name: "Cleanup",
            success: false,
            message: "Both DELETE and UPDATE failed",
            details: `DELETE: ${deleteCompanyError.message}, UPDATE: ${updateError.message}`,
            companyId: testCompanyId,
          });
        } else {
          console.log("[Cleanup] Company marked as archived with [CLEANUP] prefix");
          results.push({
            name: "Cleanup",
            success: true,
            message: "Company marked as archived (manual cleanup needed)",
            details: `Company ID: ${testCompanyId}`,
            companyId: testCompanyId,
          });
        }
      } else {
        console.log("[Cleanup] Company deleted successfully");
        results.push({
          name: "Cleanup",
          success: true,
          message: "All test data cleaned up successfully",
          details: `Deleted company: ${testCompanyId}`,
        });
      }
    }

    setTestResults(results);
    setIsTesting(false);

    // Summary toast
    const passed = results.filter((r) => r.success).length;
    const total = results.length;
    if (passed === total) {
      toast.success(`All ${total} tests passed! Onboarding should work.`);
    } else {
      toast.error(`${passed}/${total} tests passed. Check results below.`);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step A: Find an existing site using the secure RPC
      let siteId: string | null = null;

      if (siteMemberships.length > 0) {
        siteId = siteMemberships[0].site_id;
        console.log("[Onboarding] Using site from siteMemberships:", siteId);
      }

      // If no site membership, use the secure RPC to get the default site
      if (!siteId) {
        const { data: defaultSiteId, error: rpcError } = await supabase.rpc("get_default_site_id");

        if (rpcError) {
          console.error("[Onboarding] get_default_site_id error:", rpcError);
          throw new Error(`Unable to verify platform configuration. (${rpcError.code}: ${rpcError.message})`);
        }

        if (!defaultSiteId) {
          throw new Error("No active site exists. Ask an administrator to bootstrap the platform.");
        }

        siteId = defaultSiteId;
        console.log("[Onboarding] Using site from RPC:", siteId);
      }

      // Step B: Create the company under the existing site
      console.log("[Onboarding] Creating company with site_id:", siteId);
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
        console.error("[Onboarding] Company creation error:", createCompanyError);
        throw new Error(`Failed to create company. (${createCompanyError.code}: ${createCompanyError.message})`);
      }

      console.log("[Onboarding] Company created:", newCompany.id);

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
        throw new Error(`Failed to create membership. (${membershipError.code}: ${membershipError.message})`);
      }

      console.log("[Onboarding] Membership insert completed, verifying...");

      // Step C.1: Hard verification that membership was actually created
      const { data: membershipCheck, error: membershipCheckError } = await supabase
        .from("memberships")
        .select("id")
        .eq("company_id", newCompany.id)
        .eq("user_id", user.id)
        .limit(1);

      if (membershipCheckError) {
        throw new Error(`Membership verification failed. (${membershipCheckError.code}: ${membershipCheckError.message})`);
      }

      if (!membershipCheck || membershipCheck.length === 0) {
        throw new Error("Membership was not created. Onboarding aborted.");
      }

      console.log("[Onboarding] Membership verified:", membershipCheck[0].id);

      // Step D: Update profile with active_company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_company_id: newCompany.id })
        .eq("user_id", user.id);

      if (profileError) {
        console.warn("[Onboarding] Profile update warning:", profileError);
      } else {
        console.log("[Onboarding] Profile updated");
      }

      // Invalidate queries and refresh memberships
      await queryClient.invalidateQueries();
      await refreshMemberships();

      toast.success("Company created successfully!");
      navigate("/app");
    } catch (err: any) {
      console.error("[Onboarding] Error:", err);
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
            {forceMode && (
              <Badge variant="outline" className="mx-auto mb-2 text-amber-600 border-amber-500 bg-amber-500/10">
                <Bug className="h-3 w-3 mr-1" />
                FORCE MODE (dev)
              </Badge>
            )}
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
                  <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
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
            className="mt-4 space-y-4"
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
                    <span className={memberships.length === 0 ? "text-yellow-500" : "text-green-500"}>
                      {memberships.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground/70">Site Memberships:</span>{" "}
                    <span className={siteMemberships.length === 0 ? "text-yellow-500" : "text-green-500"}>
                      {siteMemberships.length}
                    </span>
                  </div>
                  {detectedSiteId && (
                    <div>
                      <span className="text-foreground/70">Detected Site ID:</span>{" "}
                      <span className="text-green-500">{detectedSiteId.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Platform Access Tests */}
            <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <FlaskConical className="h-3 w-3" />
                  Platform Access Tests
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={runPlatformTests}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="mr-2 h-3 w-3" />
                      Test Platform Access
                    </>
                  )}
                </Button>

                {testResults.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Separator />
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-2 rounded border ${
                          result.success
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {result.success ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={result.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                            {result.name}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">{result.message}</div>
                        {result.companyId && (
                          <div className="mt-1 font-mono text-[10px] text-blue-500">
                            Test Company ID: {result.companyId}
                          </div>
                        )}
                        {result.details && (
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground/70 break-all">
                            {result.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground/60 pt-2">
                  Tests create temporary rows and clean them up automatically.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
