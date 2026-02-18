import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { FrameworkMarketplaceBrowser } from "@/components/frameworks/FrameworkMarketplaceBrowser";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";

export default function FrameworkMarketplacePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework Marketplace"
        description="Browse and adopt frameworks to guide your organization's operating rhythm."
      />

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
    </div>
  );
}
