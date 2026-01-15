import * as React from "react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, CheckCircle2, AlertCircle, Shield } from "lucide-react";

interface BootstrapResult {
  ok: boolean;
  user_id: string;
  site_id: string;
  company_id: string;
  email: string;
}

export default function BootstrapPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [promoteResult, setPromoteResult] = useState<string | null>(null);

  const handleBootstrap = async () => {
    if (!user) {
      setError("No authenticated user found");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("bootstrap_first_site", {
        p_site_name: "BibleOS",
        p_company_name: "First Company",
      });

      if (rpcError) throw new Error(rpcError.message);

      const bootstrapResult = data as unknown as BootstrapResult;
      if (!bootstrapResult || !bootstrapResult.ok) {
        throw new Error("Bootstrap returned unexpected result");
      }

      setResult(bootstrapResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
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
      const { data, error: rpcError } = await supabase.rpc("promote_self_to_super_admin");

      if (rpcError) throw new Error(rpcError.message);

      setPromoteResult(JSON.stringify(data, null, 2));

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setPromoteLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          System Bootstrap
          <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
            DEV
          </Badge>
        </CardTitle>
        <CardDescription>
          Initialize a fresh system with site, company, and admin membership.
        </CardDescription>
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
                <li>Site: {result.site_id}</li>
                <li>Company: {result.company_id}</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {promoteResult && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Promotion Complete!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              <pre className="mt-2 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-24">
                {promoteResult}
              </pre>
              <p className="mt-2 text-sm">Reloading app...</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          {!result && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading || promoteLoading}>
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
                    Only works on a fresh system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBootstrap}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {!promoteResult && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading || promoteLoading}>
                  {promoteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Promote to Super Admin
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Promote to Super Admin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will grant you super_admin privileges. Only works if no super_admin exists yet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePromote}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
