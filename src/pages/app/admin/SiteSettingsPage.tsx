import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Construction } from "lucide-react";

export default function SiteSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Site Settings"
        description="Configure global site settings and preferences"
      />

      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Coming Soon</CardTitle>
          <CardDescription>
            Site settings functionality is under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>You'll be able to configure global settings, security options, and integrations here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
