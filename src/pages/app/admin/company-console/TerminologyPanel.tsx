import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Languages, RotateCcw, Save, Loader2 } from "lucide-react";
import {
  useCompanyTerminology,
  DEFAULT_TERMINOLOGY,
  TERMINOLOGY_PRESETS,
} from "@/hooks/useCompanyTerminology";

interface TermEditorProps {
  termKey: string;
  label: string;
  description: string;
}

function TermEditor({ termKey, label, description }: TermEditorProps) {
  const {
    getSingular,
    getPlural,
    isCustomized,
    updateTerminology,
    resetTerminology,
    canEdit,
  } = useCompanyTerminology();

  const currentSingular = getSingular(termKey);
  const currentPlural = getPlural(termKey);
  const defaults = DEFAULT_TERMINOLOGY[termKey];
  const presets = TERMINOLOGY_PRESETS[termKey] || [];

  const [singular, setSingular] = React.useState(currentSingular);
  const [plural, setPlural] = React.useState(currentPlural);
  const [isCustom, setIsCustom] = React.useState(false);

  // Update local state when terminology changes
  React.useEffect(() => {
    setSingular(currentSingular);
    setPlural(currentPlural);
    // Check if current values match any preset
    const matchesPreset = presets.some(
      (p) => p.singular === currentSingular && p.plural === currentPlural
    );
    setIsCustom(!matchesPreset);
  }, [currentSingular, currentPlural, presets]);

  const hasChanges = singular !== currentSingular || plural !== currentPlural;
  const isUpdating = updateTerminology.isPending;
  const isResetting = resetTerminology.isPending;

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setIsCustom(true);
      return;
    }
    
    const preset = presets.find((p) => p.singular === value);
    if (preset) {
      setSingular(preset.singular);
      setPlural(preset.plural);
      setIsCustom(false);
    }
  };

  const handleSave = () => {
    if (!singular.trim() || !plural.trim()) return;
    updateTerminology.mutate({
      termKey,
      singular: singular.trim(),
      plural: plural.trim(),
    });
  };

  const handleReset = () => {
    resetTerminology.mutate(termKey);
  };

  // Find current preset value
  const currentPresetValue = isCustom
    ? "custom"
    : presets.find((p) => p.singular === singular)?.singular || "custom";

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{label}</h4>
            {isCustomized(termKey) && (
              <Badge variant="secondary" className="text-xs">
                Customized
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Preset</Label>
          <Select
            value={currentPresetValue}
            onValueChange={handlePresetChange}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.singular} value={preset.singular}>
                  {preset.singular} / {preset.plural}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${termKey}-singular`}>Singular</Label>
              <Input
                id={`${termKey}-singular`}
                value={singular}
                onChange={(e) => setSingular(e.target.value)}
                placeholder={defaults?.singular || "Singular"}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${termKey}-plural`}>Plural</Label>
              <Input
                id={`${termKey}-plural`}
                value={plural}
                onChange={(e) => setPlural(e.target.value)}
                placeholder={defaults?.plural || "Plural"}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || !canEdit || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          {isCustomized(termKey) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={!canEdit || isResetting}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to Default
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TerminologyPanel() {
  const { isLoading, canEdit } = useCompanyTerminology();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Terminology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Terminology
        </CardTitle>
        <CardDescription>
          Customize how core concepts are labeled throughout the app. Changes apply
          to navigation, headings, buttons, and messaging—but not to URLs or
          internal identifiers.
        </CardDescription>
        {!canEdit && (
          <p className="text-sm text-muted-foreground mt-2">
            Only company administrators can modify terminology settings.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <TermEditor
          termKey="company"
          label="Organization Entity"
          description="What you call your organization or business unit."
        />

        <Separator />

        <TermEditor
          termKey="crm_client"
          label="CRM Entity"
          description="What you call the people or entities you work with (clients, donors, patients, etc.)."
        />

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> Terminology changes affect display labels only.
            URLs, database tables, and audit logs remain unchanged to preserve
            data integrity and consistency.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
