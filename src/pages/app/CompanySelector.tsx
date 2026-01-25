import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Loader2, Check } from "lucide-react";
import { useMembership } from "@/lib/membership";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export default function CompanySelector() {
  const navigate = useNavigate();
  const { memberships, activeCompanyId, setActiveCompany, loading: membershipsLoading } = useMembership();
  const [selecting, setSelecting] = React.useState<string | null>(null);

  const handleSelectCompany = async (companyId: string) => {
    setSelecting(companyId);
    await setActiveCompany(companyId);
    navigate("/app");
  };

  // Handle redirects
  React.useEffect(() => {
    if (membershipsLoading) return;
    
    if (memberships.length === 0) {
      navigate("/app/onboarding");
    } else if (memberships.length === 1) {
      handleSelectCompany(memberships[0].company_id);
    }
  }, [membershipsLoading, memberships.length]);

  if (membershipsLoading || memberships.length <= 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Select a Company</h1>
          <p className="text-muted-foreground mt-1">Choose which company you want to access</p>
        </div>

        <div className="space-y-3">
          {memberships.map((membership) => (
            <Card
              key={membership.id}
              className="cursor-pointer transition-all hover:border-primary"
              onClick={() => handleSelectCompany(membership.company_id)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{membership.company.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{membership.role}</p>
                </div>
                {selecting === membership.company_id && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
