import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export default function CompanySelector() {
  const navigate = useNavigate();
  const { memberships, activeCompanyId, setActiveCompany, loading, isSiteAdmin } = useMembership();
  const [selecting, setSelecting] = React.useState<string | null>(null);

  const handleSelectCompany = async (companyId: string) => {
    setSelecting(companyId);
    try {
      await setActiveCompany(companyId);
      toast.success("Company selected");
      navigate("/app");
    } catch (error) {
      toast.error("Failed to select company");
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No memberships - show onboarding message
  if (memberships.length === 0 && !isSiteAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <Logo className="justify-center mb-8" size="lg" />
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            No Companies Yet
          </h1>
          <p className="text-muted-foreground mb-6">
            You haven't been added to any companies. Contact your administrator
            to get access, or wait for an invitation.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Logo className="justify-center mb-8" size="lg" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Select a Company
          </h1>
          <p className="text-muted-foreground">
            Choose which company you'd like to work in
          </p>
        </motion.div>

        <div className="space-y-3">
          {memberships.map((membership, index) => (
            <motion.div
              key={membership.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeCompanyId === membership.company_id
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleSelectCompany(membership.company_id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {membership.company.logo_url ? (
                      <img
                        src={membership.company.logo_url}
                        alt={membership.company.name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {membership.company.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {membership.role.replace("_", " ")} • {membership.member_type}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {selecting === membership.company_id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    ) : activeCompanyId === membership.company_id ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {isSiteAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Button variant="outline" onClick={() => navigate("/app/admin")}>
              Go to Site Administration
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
