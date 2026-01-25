import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMembership } from "@/lib/membership";
import { CompanyIntegrationsTab } from "./CompanyIntegrationsTab";
import { SiteIntegrationsTab } from "./SiteIntegrationsTab";

export default function IntegrationsPage() {
  const { isSiteAdmin, isSuperAdmin } = useMembership();
  const showSiteTab = isSiteAdmin || isSuperAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external services and APIs to extend functionality."
      />

      {showSiteTab ? (
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company">Company Integrations</TabsTrigger>
            <TabsTrigger value="site">Site Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <CompanyIntegrationsTab />
          </TabsContent>

          <TabsContent value="site" className="space-y-6">
            <SiteIntegrationsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <CompanyIntegrationsTab />
      )}
    </div>
  );
}
