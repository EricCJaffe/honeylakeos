import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { Loader2, Rocket, CheckCircle2, AlertCircle, ArrowRight, Shield } from "lucide-react";

interface BootstrapResult {
  ok: boolean;
  user_id: string;
  site_id: string;
  company_id: string;
  email: string;
}

export default function BootstrapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [promoteResult, setPromoteResult] = useState<string | null>(null);

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

    try {
      console.log("[Bootstrap] Calling bootstrap_first_site RPC for user:", user.id);

      const { data, error: rpcError } = await supabase.rpc("bootstrap_first_site", {
        p_site_name: "BibleOS",
        p_company_name: "First Company",
      });

      if (rpcError) {
        console.error("[Bootstrap] RPC error:", rpcError);
        throw new Error(rpcError.message);
      }

      const bootstrapResult = data as unknown as BootstrapResult;
      if (!bootstrapResult || !bootstrapResult.ok) {
        throw new Error("Bootstrap returned unexpected result");
      }

      console.log("[Bootstrap] Bootstrap complete:", bootstrapResult);
      setResult(bootstrapResult);

      // Auto-navigate to dashboard after short delay
      setTimeout(() => {
        navigate("/app");
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[Bootstrap] Error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!user) {
      setError("No authenticated user found");
      return;
    }

    setPromoteLoading(true);
    setError(null);
    setPromoteResult(null);

    try {
      console.log("[Promote] Calling promote_self_to_super_admin RPC for user:", user.id);

      const { data, error: rpcError } = await supabase.rpc("promote_self_to_super_admin");

      if (rpcError) {
        console.error("[Promote] RPC error:", rpcError);
        throw new Error(rpcError.message);
      }

      console.log("[Promote] Promotion complete:", data);
      setPromoteResult(JSON.stringify(data, null, 2));

      // Reload the app after short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[Promote] Error:", message);
      setError(message);
    } finally {
      setPromoteLoading(false);
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
                  <li>User: {result.user_id}</li>
                  <li>Site: {result.site_id}</li>
                  <li>Company: {result.company_id}</li>
                  <li>Email: {result.email}</li>
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

          {promoteResult && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Promotion Complete!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                <pre className="mt-2 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
                  {promoteResult}
                </pre>
                <p className="mt-2 text-sm">Reloading app...</p>
              </AlertDescription>
            </Alert>
          )}

          {!result && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={loading || promoteLoading}>
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
                    This action only works once on a fresh system (when no sites exist).
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

          <Separator />

          {!promoteResult && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={loading || promoteLoading}>
                  {promoteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Promote Me to Super Admin
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Promote to Super Admin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will grant you super_admin privileges on the first site. 
                    This action only works if no super_admin exists yet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePromote}>
                    Confirm Promotion
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
