import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshMemberships } = useMembership();
  const [companyName, setCompanyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !companyName.trim()) return;
    
    setIsCreating(true);
    
    try {
      // Create the company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          created_by: user.id,
          status: "active",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create membership for the user
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "admin",
          status: "active",
        });

      if (membershipError) throw membershipError;

      toast.success("Company created successfully!");
      
      // Refresh memberships and navigate to dashboard
      await refreshMemberships();
      navigate("/app");
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast.error(error.message || "Failed to create company");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Create Your First Company</h1>
          <p className="text-muted-foreground mt-1">
            Let's set up your workspace to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Details
            </CardTitle>
            <CardDescription>
              Enter your company or organization name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!companyName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
