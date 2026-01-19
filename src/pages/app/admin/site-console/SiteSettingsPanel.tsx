import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ExternalLink,
  KeyRound,
  Mail,
  Users,
  Lock,
} from "lucide-react";

interface SecuritySettingItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "enabled" | "disabled" | "info";
  statusLabel?: string;
}

function SecuritySettingItem({ 
  icon: Icon, 
  title, 
  description, 
  status, 
  statusLabel 
}: SecuritySettingItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className="mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{title}</span>
          {status === "enabled" && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-3 w-3" />
              {statusLabel || "Enabled"}
            </Badge>
          )}
          {status === "disabled" && (
            <Badge variant="secondary" className="gap-1 text-amber-600 bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-3 w-3" />
              {statusLabel || "Not Configured"}
            </Badge>
          )}
          {status === "info" && (
            <Badge variant="outline" className="gap-1">
              <Info className="h-3 w-3" />
              {statusLabel || "Info"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function SiteSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication Security
        </CardTitle>
        <CardDescription>
          Review authentication security settings. Configure these in the backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <SecuritySettingItem
            icon={KeyRound}
            title="Leaked Password Protection"
            description="Checks passwords against known breach databases (HaveIBeenPwned) during sign-up and password changes."
            status="info"
            statusLabel="Backend Setting"
          />
          
          <SecuritySettingItem
            icon={Mail}
            title="Email Confirmation"
            description="Requires users to confirm their email address before signing in. Auto-confirm is enabled for development."
            status="enabled"
            statusLabel="Auto-Confirm"
          />
          
          <SecuritySettingItem
            icon={Users}
            title="User Signups"
            description="Controls whether new users can register accounts on the platform."
            status="enabled"
            statusLabel="Allowed"
          />
          
          <SecuritySettingItem
            icon={Lock}
            title="Anonymous Users"
            description="Allows users to access the app without creating an account."
            status="disabled"
            statusLabel="Disabled"
          />
        </div>

        <Separator />

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Configure Security Settings</p>
              <p className="text-xs text-muted-foreground">
                Advanced authentication security settings like leaked password protection, 
                MFA requirements, and session policies are configured in the Lovable Cloud backend.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                // This opens the Lovable Cloud backend
                window.open('https://lovable.dev/projects', '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Open Lovable Cloud
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => {
                window.open('https://docs.lovable.dev/features/cloud', '_blank');
              }}
            >
              <Info className="h-3 w-3" />
              View Documentation
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Security Recommendations:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Enable leaked password protection for production apps</li>
            <li>Consider requiring email confirmation for sensitive applications</li>
            <li>Disable anonymous users unless specifically needed</li>
            <li>Review and rotate API keys periodically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
