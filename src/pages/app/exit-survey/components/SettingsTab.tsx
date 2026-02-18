import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useExitSurveySettings, useExitSurveyMutations } from "@/hooks/useExitSurvey";
import { Save } from "lucide-react";

export function SettingsTab() {
  const { data: settings, isLoading } = useExitSurveySettings();
  const { updateSettings } = useExitSurveyMutations();

  const [threshold, setThreshold] = useState(3);
  const [anonymity, setAnonymity] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reportSchedule, setReportSchedule] = useState("monthly");
  const [dirty, setDirty] = useState(false);

  // Sync from server settings
  useEffect(() => {
    if (!settings) return;
    setThreshold(parseInt(settings.alert_threshold ?? "3") || 3);
    setAnonymity(settings.anonymity === "true");
    setEmailNotifications(settings.email_notifications !== "false");
    setReportSchedule(settings.report_schedule ?? "monthly");
  }, [settings]);

  async function handleSave() {
    await Promise.all([
      updateSettings.mutateAsync({ key: "alert_threshold", value: String(threshold) }),
      updateSettings.mutateAsync({ key: "anonymity", value: String(anonymity) }),
      updateSettings.mutateAsync({ key: "email_notifications", value: String(emailNotifications) }),
      updateSettings.mutateAsync({ key: "report_schedule", value: reportSchedule }),
    ]);
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Alert threshold */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Alert Threshold</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Create an alert when a scored response is at or below this value.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Slider
                min={1}
                max={5}
                step={1}
                value={[threshold]}
                onValueChange={([val]) => { setThreshold(val); setDirty(true); }}
                className="w-full"
              />
            </div>
            <span className="w-8 text-center font-bold text-lg text-teal-600">{threshold}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>1 – Alert only on 1s</span>
            <span>5 – Alert on all</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: score ≤ <strong>{threshold}</strong> triggers an alert
            {threshold === 1 ? " (only 1s)" : threshold === 5 ? " (all scores)" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Anonymity Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hide patient names in the Submissions and Alerts tabs
              </p>
            </div>
            <Switch
              checked={anonymity}
              onCheckedChange={(v) => { setAnonymity(v); setDirty(true); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Email Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Send alert emails to question owners</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When a low score is received, notify the relevant department owner
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(v) => { setEmailNotifications(v); setDirty(true); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Report Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-sm mb-2 block">Auto-generate PDF reports</Label>
          <Select
            value={reportSchedule}
            onValueChange={(v) => { setReportSchedule(v); setDirty(true); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={!dirty || updateSettings.isPending}
        className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
      >
        <Save className="w-4 h-4" />
        {updateSettings.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
