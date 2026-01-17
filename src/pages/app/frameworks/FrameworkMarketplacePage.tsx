import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMembership } from "@/lib/membership";
import { useCoachingOrgSettings } from "@/hooks/useCoaching";
import { PageHeader } from "@/components/PageHeader";
import { FrameworkMarketplaceBrowser } from "@/components/frameworks/FrameworkMarketplaceBrowser";
import { CoachOrgFrameworkManager } from "@/components/frameworks/CoachOrgFrameworkManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Layers, Settings } from "lucide-react";

export default function FrameworkMarketplacePage() {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { data: coachingOrgSettings } = useCoachingOrgSettings();
  
  const isCoachOrg = !!coachingOrgSettings;
  const [activeTab, setActiveTab] = useState(isCoachOrg ? "manage" : "browse");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework Marketplace"
        description="Browse, publish, and manage frameworks"
      />

      {isCoachOrg && isCompanyAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="manage">
              <Settings className="h-4 w-4 mr-2" />
              My Frameworks
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Store className="h-4 w-4 mr-2" />
              Browse Marketplace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="mt-6">
            <CoachOrgFrameworkManager />
          </TabsContent>

          <TabsContent value="browse" className="mt-6">
            <FrameworkMarketplaceBrowser 
              onFrameworkAdopted={() => navigate("/app/frameworks")} 
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Available Frameworks
              </CardTitle>
              <CardDescription>
                Browse and adopt frameworks to guide your organization's operating rhythm.
              </CardDescription>
            </CardHeader>
          </Card>

          <FrameworkMarketplaceBrowser 
            onFrameworkAdopted={() => navigate("/app/frameworks")} 
          />
        </div>
      )}
    </div>
  );
}
