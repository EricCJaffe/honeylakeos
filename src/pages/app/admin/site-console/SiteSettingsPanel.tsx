import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SiteSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Site Settings
        </CardTitle>
        <CardDescription>
          Configure global settings for the site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-12">
          Site settings configuration coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
