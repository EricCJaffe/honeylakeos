import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanySettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Company settings configuration will be available here. You'll be able to manage:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Company name and branding</li>
            <li>• Logo and primary color</li>
            <li>• Module access and permissions</li>
            <li>• Locations and branches</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
