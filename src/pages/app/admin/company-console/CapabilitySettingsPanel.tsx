import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useCapabilitySettings, 
  CAPABILITY_LABELS, 
  CapabilityFlag 
} from "@/hooks/useCapabilitySettings";
import { useCompanyModules } from "@/hooks/useCompanyModules";

interface CapabilityToggleProps {
  flag: CapabilityFlag;
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  moduleDisabled?: boolean;
  onToggle: (value: boolean) => void;
}

function CapabilityToggle({ 
  flag, 
  label, 
  description, 
  value, 
  disabled, 
  moduleDisabled,
  onToggle 
}: CapabilityToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={flag} className="font-medium">
            {label}
          </Label>
          {moduleDisabled && (
            <Badge variant="secondary" className="text-xs">Module disabled</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          Current behavior: <span className="font-medium">{value ? "Members can perform this action" : "Admin only"}</span>
        </p>
      </div>
      <Switch
        id={flag}
        checked={value}
        onCheckedChange={onToggle}
        disabled={disabled || moduleDisabled}
      />
    </div>
  );
}

interface CapabilitySectionProps {
  title: string;
  description: string;
  flags: CapabilityFlag[];
  settings: Record<CapabilityFlag, boolean>;
  disabled: boolean;
  moduleDisabled?: boolean;
  onToggle: (flag: CapabilityFlag, value: boolean) => void;
}

function CapabilitySection({ 
  title, 
  description, 
  flags, 
  settings, 
  disabled,
  moduleDisabled,
  onToggle 
}: CapabilitySectionProps) {
  return (
    <div className="space-y-2">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y">
        {flags.map((flag) => (
          <CapabilityToggle
            key={flag}
            flag={flag}
            label={CAPABILITY_LABELS[flag].label}
            description={CAPABILITY_LABELS[flag].description}
            value={settings[flag]}
            disabled={disabled}
            moduleDisabled={moduleDisabled}
            onToggle={(value) => onToggle(flag, value)}
          />
        ))}
      </div>
    </div>
  );
}

export function CapabilitySettingsPanel() {
  const { 
    settings, 
    isLoading, 
    canEdit, 
    updateSettings, 
    isUpdating 
  } = useCapabilitySettings();

  const { isEnabled } = useCompanyModules();

  const handleToggle = async (flag: CapabilityFlag, value: boolean) => {
    await updateSettings({ [flag]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Member Capabilities</CardTitle>
        </div>
        <CardDescription>
          Control what actions regular company members can perform. Admins always have full access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canEdit && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only company admins can modify these settings.
            </AlertDescription>
          </Alert>
        )}

        {/* CRM */}
        <CapabilitySection
          title="CRM"
          description="Customer relationship management records"
          flags={["crm_member_manage_enabled"]}
          settings={settings as any}
          disabled={!canEdit || isUpdating}
          moduleDisabled={!isEnabled("crm")}
          onToggle={handleToggle}
        />

        <Separator />

        {/* External Contacts */}
        <CapabilitySection
          title="External Contacts"
          description="Shared contact directory for non-users"
          flags={["contacts_member_manage_enabled"]}
          settings={settings as any}
          disabled={!canEdit || isUpdating}
          onToggle={handleToggle}
        />

        <Separator />

        {/* Forms */}
        <CapabilitySection
          title="Forms & Workflows"
          description="Form builder and workflow automation"
          flags={["forms_member_manage_enabled", "forms_member_publish_enabled"]}
          settings={settings as any}
          disabled={!canEdit || isUpdating}
          moduleDisabled={!isEnabled("forms")}
          onToggle={handleToggle}
        />

        <Separator />

        {/* LMS */}
        <CapabilitySection
          title="Learning Management"
          description="Courses, cohorts, and sessions"
          flags={["lms_member_manage_enabled", "lms_member_publish_enabled"]}
          settings={settings as any}
          disabled={!canEdit || isUpdating}
          moduleDisabled={!isEnabled("lms")}
          onToggle={handleToggle}
        />

        {/* Info note */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Changing these settings only affects future actions. Existing published items remain 
            published even if the publish capability is restricted.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
