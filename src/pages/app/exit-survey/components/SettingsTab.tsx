import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RichTextField } from "@/components/ui/rich-text-field";
import {
  useExitSurveySettings,
  useExitSurveyMutations,
  useExitSurveyEmailTemplates,
  type ExitSurveyEmailTemplate,
} from "@/hooks/useExitSurvey";
import { useMembership } from "@/lib/membership";
import { Save, ChevronDown, Send, Sparkles } from "lucide-react";

const AUTOMATION_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TZ_OPTIONS = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "UTC"] as const;

const BUILT_IN_TEMPLATES: Array<{
  trigger_key: string;
  name: string;
  description: string;
  subject_template: string;
  html_template: string;
  text_template: string;
}> = [
  {
    trigger_key: "low_score_alert",
    name: "Low Score Alert",
    description: "Notifies question owner about low score submissions.",
    subject_template: "[Alert] Low score for {{department}}",
    html_template:
      "<p>Hello {{owner_name}},</p><p>A low score ({{score}}) was submitted for <strong>{{question_text}}</strong>.</p><p>Patient: {{patient_name}}</p><p><a href='{{dashboard_url}}'>Open dashboard</a></p>",
    text_template:
      "Hello {{owner_name}},\n\nA low score ({{score}}) was submitted for {{question_text}}.\nPatient: {{patient_name}}\n\nOpen dashboard: {{dashboard_url}}",
  },
  {
    trigger_key: "weekly_digest",
    name: "Weekly Digest",
    description: "Weekly summary of survey activity and open alerts.",
    subject_template: "Weekly Exit Survey Summary ({{date_range}})",
    html_template:
      "<p>Hello {{owner_name}},</p><p>Here is your weekly summary for {{department}}.</p><p>Open follow-ups: {{open_followups}}</p><p><a href='{{dashboard_url}}'>Open dashboard</a></p>",
    text_template:
      "Hello {{owner_name}},\n\nHere is your weekly summary for {{department}}.\nOpen follow-ups: {{open_followups}}\n\nOpen dashboard: {{dashboard_url}}",
  },
  {
    trigger_key: "alert_reminder",
    name: "Alert Reminder",
    description: "Reminds assignee/owner about unresolved alerts.",
    subject_template: "Reminder: Exit Survey follow-up required",
    html_template:
      "<p>Hello {{owner_name}},</p><p>This is a reminder to review unresolved follow-ups.</p><p>Question: {{question_text}}</p><p>Score: {{score}}</p><p><a href='{{submission_url}}'>Review response</a></p>",
    text_template:
      "Hello {{owner_name}},\n\nReminder to review unresolved follow-ups.\nQuestion: {{question_text}}\nScore: {{score}}\n\nReview response: {{submission_url}}",
  },
  {
    trigger_key: "survey_assignment",
    name: "Survey Assignment",
    description: "Sent when an employee is assigned an exit survey follow-up.",
    subject_template: "New Exit Survey Follow-Up Assigned",
    html_template:
      "<p>Hello {{assignee_name}},</p><p>You were assigned a new exit survey follow-up for {{patient_name}}.</p><p><a href='{{survey_url}}'>Open survey</a></p>",
    text_template:
      "Hello {{assignee_name}},\n\nYou were assigned a new exit survey follow-up for {{patient_name}}.\n\nOpen survey: {{survey_url}}",
  },
];

const DEFAULT_SAMPLE_VARS: Record<string, string> = {
  owner_name: "Clinical Leader",
  department: "Treatment Team",
  score: "2",
  question_text: "I felt informed by my provider",
  patient_name: "Jane Doe",
  dashboard_url: "https://app.example.com/app/exit-survey",
  submission_url: "https://app.example.com/app/exit-survey/submissions/123",
  survey_url: "https://app.example.com/exit-survey",
  assignee_name: "Care Manager",
  open_followups: "3",
  date_range: "Feb 21 - Feb 28",
};

function extractVariables(...templates: Array<string | null | undefined>) {
  const vars = new Set<string>();
  for (const template of templates) {
    if (!template) continue;
    for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
      if (match[1]) vars.add(match[1]);
    }
  }
  return Array.from(vars).sort();
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => vars[key] ?? `{{${key}}}`);
}

export function SettingsTab() {
  const { activeCompanyId } = useMembership();
  const { data: settings, isLoading } = useExitSurveySettings();
  const { data: templates = [] } = useExitSurveyEmailTemplates();
  const {
    updateSettings,
    saveSettingsBatch,
    upsertEmailTemplate,
    sendEmailTemplateTest,
    runAutomationTriggerTest,
    runRetentionScan,
  } = useExitSurveyMutations();

  const [threshold, setThreshold] = useState(3);
  const [anonymity, setAnonymity] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [phiSafeEmailMode, setPhiSafeEmailMode] = useState(false);
  const [reminderRecipientEmails, setReminderRecipientEmails] = useState("");
  const [weeklyDigestRecipientEmails, setWeeklyDigestRecipientEmails] = useState("");
  const [reportSchedule, setReportSchedule] = useState("monthly");

  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyDay, setWeeklyDay] = useState("monday");
  const [weeklyTime, setWeeklyTime] = useState("09:00");
  const [weeklyTimezone, setWeeklyTimezone] = useState("America/New_York");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("10:00");
  const [reminderTimezone, setReminderTimezone] = useState("America/New_York");
  const [reminderDelayHours, setReminderDelayHours] = useState(72);
  const [retentionMode, setRetentionMode] = useState("off");
  const [retentionSubmissionsDays, setRetentionSubmissionsDays] = useState(365);
  const [retentionAlertsDays, setRetentionAlertsDays] = useState(180);
  const [retentionExportsDays, setRetentionExportsDays] = useState(90);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [templateTriggerKey, setTemplateTriggerKey] = useState("low_score_alert");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [testEmailTo, setTestEmailTo] = useState("");

  const [open, setOpen] = useState({
    threshold: true,
    privacy: false,
    notifications: false,
    automation: false,
    retention: false,
    emailMode: false,
    templates: false,
    report: false,
  });
  const [dirty, setDirty] = useState(false);

  const sampleVars = useMemo(() => DEFAULT_SAMPLE_VARS, []);
  const renderedPreview = useMemo(() => {
    return {
      subject: renderTemplate(templateSubject || "", sampleVars),
      html: renderTemplate(templateHtml || "", sampleVars),
      text: renderTemplate(templateText || "", sampleVars),
    };
  }, [templateHtml, templateSubject, templateText, sampleVars]);

  const detectedVariables = useMemo(
    () => extractVariables(templateSubject, templateHtml, templateText),
    [templateSubject, templateHtml, templateText]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    if (!settings) return;
    setThreshold(parseInt(settings.alert_threshold ?? "3", 10) || 3);
    setAnonymity(settings.anonymity === "true");
    setEmailNotifications(settings.email_notifications !== "false");
    setPhiSafeEmailMode(settings.phi_safe_email_mode === "true");
    setReminderRecipientEmails(settings.reminder_recipient_emails ?? "");
    setWeeklyDigestRecipientEmails(settings.weekly_digest_recipient_emails ?? "");
    setReportSchedule(settings.report_schedule ?? "monthly");

    setWeeklyEnabled(settings.automation_weekly_digest_enabled === "true");
    setWeeklyDay(settings.automation_weekly_digest_day ?? "monday");
    setWeeklyTime(settings.automation_weekly_digest_time ?? "09:00");
    setWeeklyTimezone(settings.automation_weekly_digest_timezone ?? "America/New_York");

    setReminderEnabled(settings.automation_reminder_enabled === "true");
    setReminderTime(settings.automation_reminder_time ?? "10:00");
    setReminderTimezone(settings.automation_reminder_timezone ?? "America/New_York");
    setReminderDelayHours(parseInt(settings.automation_reminder_delay_hours ?? "72", 10) || 72);
    setRetentionMode(settings.retention_mode ?? "off");
    setRetentionSubmissionsDays(parseInt(settings.retention_submissions_days ?? "365", 10) || 365);
    setRetentionAlertsDays(parseInt(settings.retention_alerts_days ?? "180", 10) || 180);
    setRetentionExportsDays(parseInt(settings.retention_exports_days ?? "90", 10) || 90);
  }, [settings]);

  useEffect(() => {
    if (!selectedTemplate && templates.length) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateName(selectedTemplate.name);
    setTemplateTriggerKey(selectedTemplate.trigger_key);
    setTemplateDescription(selectedTemplate.description ?? "");
    setTemplateSubject(selectedTemplate.subject_template);
    setTemplateHtml(selectedTemplate.html_template);
    setTemplateText(selectedTemplate.text_template ?? "");
  }, [selectedTemplate]);

  async function handleSaveSettings() {
    await Promise.all([
      updateSettings.mutateAsync({ key: "alert_threshold", value: String(threshold) }),
      updateSettings.mutateAsync({ key: "anonymity", value: String(anonymity) }),
      updateSettings.mutateAsync({ key: "email_notifications", value: String(emailNotifications) }),
      updateSettings.mutateAsync({ key: "phi_safe_email_mode", value: String(phiSafeEmailMode) }),
      updateSettings.mutateAsync({ key: "reminder_recipient_emails", value: reminderRecipientEmails.trim() }),
      updateSettings.mutateAsync({ key: "weekly_digest_recipient_emails", value: weeklyDigestRecipientEmails.trim() }),
      updateSettings.mutateAsync({ key: "retention_mode", value: retentionMode }),
      updateSettings.mutateAsync({ key: "retention_submissions_days", value: String(retentionSubmissionsDays) }),
      updateSettings.mutateAsync({ key: "retention_alerts_days", value: String(retentionAlertsDays) }),
      updateSettings.mutateAsync({ key: "retention_exports_days", value: String(retentionExportsDays) }),
      updateSettings.mutateAsync({ key: "report_schedule", value: reportSchedule }),
      saveSettingsBatch.mutateAsync([
        { key: "automation_weekly_digest_enabled", value: String(weeklyEnabled), category: "automation" },
        { key: "automation_weekly_digest_day", value: weeklyDay, category: "automation" },
        { key: "automation_weekly_digest_time", value: weeklyTime, category: "automation" },
        { key: "automation_weekly_digest_timezone", value: weeklyTimezone, category: "automation" },
        { key: "automation_reminder_enabled", value: String(reminderEnabled), category: "automation" },
        { key: "automation_reminder_time", value: reminderTime, category: "automation" },
        { key: "automation_reminder_timezone", value: reminderTimezone, category: "automation" },
        { key: "automation_reminder_delay_hours", value: String(reminderDelayHours), category: "automation" },
      ]),
    ]);

    setDirty(false);
  }

  async function handleInitializeBuiltIns() {
    for (const template of BUILT_IN_TEMPLATES) {
      const existing = templates.find((t) => t.trigger_key === template.trigger_key);
      if (existing) continue;
      await upsertEmailTemplate.mutateAsync({
        ...template,
        variables: extractVariables(template.subject_template, template.html_template, template.text_template),
        is_active: true,
        is_system: true,
      });
    }
  }

  async function handleSaveTemplate() {
    await upsertEmailTemplate.mutateAsync({
      id: selectedTemplateId || undefined,
      trigger_key: templateTriggerKey,
      name: templateName,
      description: templateDescription,
      subject_template: templateSubject,
      html_template: templateHtml,
      text_template: templateText,
      variables: detectedVariables,
      is_active: true,
      is_system: selectedTemplate?.is_system ?? false,
    });
  }

  async function handleCreateTemplate() {
    setSelectedTemplateId("");
    setTemplateName("New Template");
    setTemplateTriggerKey("custom_trigger");
    setTemplateDescription("");
    setTemplateSubject("Subject with {{variable}}");
    setTemplateHtml("<p>Hello {{name}}</p>");
    setTemplateText("Hello {{name}}");
  }

  async function handleSendTemplateTest() {
    if (!activeCompanyId || !testEmailTo.trim()) return;
    await sendEmailTemplateTest.mutateAsync({
      company_id: activeCompanyId,
      trigger_key: templateTriggerKey,
      template_name: templateName,
      to_email: testEmailTo.trim(),
      subject_template: templateSubject,
      html_template: templateHtml,
      text_template: templateText,
      sample_variables: sampleVars,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Collapsible open={open.threshold} onOpenChange={(value) => setOpen((prev) => ({ ...prev, threshold: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Alert Threshold</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.threshold ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Create an alert when a scored response is at or below this value.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[threshold]}
                    onValueChange={([val]) => {
                      setThreshold(val);
                      setDirty(true);
                    }}
                    className="w-full"
                  />
                </div>
                <span className="w-8 text-center font-bold text-lg text-teal-600">{threshold}</span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.privacy} onOpenChange={(value) => setOpen((prev) => ({ ...prev, privacy: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Privacy</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.privacy ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Anonymity Mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Hide patient names in the Submissions and Alerts tabs</p>
                </div>
                <Switch
                  checked={anonymity}
                  onCheckedChange={(v) => {
                    setAnonymity(v);
                    setDirty(true);
                  }}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.notifications} onOpenChange={(value) => setOpen((prev) => ({ ...prev, notifications: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Email Notifications</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.notifications ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Send alert emails to question owners</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">When a low score is received, notify the relevant owner</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(v) => {
                    setEmailNotifications(v);
                    setDirty(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Reminder recipient override (optional)</Label>
                <Textarea
                  value={reminderRecipientEmails}
                  onChange={(e) => {
                    setReminderRecipientEmails(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="email1@company.com, email2@company.com"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Weekly digest recipient override (optional)</Label>
                <Textarea
                  value={weeklyDigestRecipientEmails}
                  onChange={(e) => {
                    setWeeklyDigestRecipientEmails(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="leader1@company.com, leader2@company.com"
                  rows={2}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.automation} onOpenChange={(value) => setOpen((prev) => ({ ...prev, automation: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Automation Triggers</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.automation ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Weekly Digest Trigger</Label>
                  <Switch checked={weeklyEnabled} onCheckedChange={(v) => { setWeeklyEnabled(v); setDirty(true); }} />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Select value={weeklyDay} onValueChange={(v) => { setWeeklyDay(v); setDirty(true); }}>
                    <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_DAYS.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="time" value={weeklyTime} onChange={(e) => { setWeeklyTime(e.target.value); setDirty(true); }} />
                  <Select value={weeklyTimezone} onValueChange={(v) => { setWeeklyTimezone(v); setDirty(true); }}>
                    <SelectTrigger><SelectValue placeholder="Timezone" /></SelectTrigger>
                    <SelectContent>
                      {TZ_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAutomationTriggerTest.mutate({ trigger: "weekly_digest", dryRun: true })}
                    disabled={runAutomationTriggerTest.isPending}
                  >
                    Dry Run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAutomationTriggerTest.mutate({ trigger: "weekly_digest" })}
                    disabled={runAutomationTriggerTest.isPending}
                  >
                    Test Send
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Alert Reminder Trigger</Label>
                  <Switch checked={reminderEnabled} onCheckedChange={(v) => { setReminderEnabled(v); setDirty(true); }} />
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <Input type="time" value={reminderTime} onChange={(e) => { setReminderTime(e.target.value); setDirty(true); }} />
                  <Select value={reminderTimezone} onValueChange={(v) => { setReminderTimezone(v); setDirty(true); }}>
                    <SelectTrigger><SelectValue placeholder="Timezone" /></SelectTrigger>
                    <SelectContent>
                      {TZ_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={24}
                    step={1}
                    value={String(reminderDelayHours)}
                    onChange={(e) => {
                      setReminderDelayHours(Number(e.target.value) || 72);
                      setDirty(true);
                    }}
                    placeholder="Delay hours"
                  />
                  <Button
                    variant="outline"
                    onClick={() => runAutomationTriggerTest.mutate({ trigger: "alert_reminder" })}
                    disabled={runAutomationTriggerTest.isPending}
                  >
                    Test Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.retention} onOpenChange={(value) => setOpen((prev) => ({ ...prev, retention: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Retention Policy (Scaffold)</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.retention ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Configure retention windows and run dry-run scans. Destructive deletion is intentionally disabled in this phase.
              </p>
              <div className="grid md:grid-cols-4 gap-3">
                <Select value={retentionMode} onValueChange={(v) => { setRetentionMode(v); setDirty(true); }}>
                  <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="dry_run">Dry-run only</SelectItem>
                    <SelectItem value="archive_only">Archive-only (future)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={30}
                  value={String(retentionSubmissionsDays)}
                  onChange={(e) => { setRetentionSubmissionsDays(Number(e.target.value) || 365); setDirty(true); }}
                  placeholder="Submission days"
                />
                <Input
                  type="number"
                  min={30}
                  value={String(retentionAlertsDays)}
                  onChange={(e) => { setRetentionAlertsDays(Number(e.target.value) || 180); setDirty(true); }}
                  placeholder="Alert days"
                />
                <Input
                  type="number"
                  min={30}
                  value={String(retentionExportsDays)}
                  onChange={(e) => { setRetentionExportsDays(Number(e.target.value) || 90); setDirty(true); }}
                  placeholder="Export days"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => runRetentionScan.mutate({ dryRun: true, apply: false })}
                  disabled={runRetentionScan.isPending}
                >
                  Run Dry-Run Scan
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.emailMode} onOpenChange={(value) => setOpen((prev) => ({ ...prev, emailMode: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">HIPAA Email Mode</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.emailMode ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">PHI-safe email mode (summary only)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Redacts patient-identifying details from reminder and alert emails.</p>
                </div>
                <Switch
                  checked={phiSafeEmailMode}
                  onCheckedChange={(v) => {
                    setPhiSafeEmailMode(v);
                    setDirty(true);
                  }}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.templates} onOpenChange={(value) => setOpen((prev) => ({ ...prev, templates: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Email Template Manager</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.templates ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleInitializeBuiltIns} disabled={upsertEmailTemplate.isPending}>
                  <Sparkles className="w-4 h-4 mr-2" /> Initialize Built-In Templates
                </Button>
                <Button variant="outline" onClick={handleCreateTemplate}>New Custom Template</Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <Select value={selectedTemplateId || "none"} onValueChange={(v) => setSelectedTemplateId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Custom / unsaved</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.trigger_key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
                <Input value={templateTriggerKey} onChange={(e) => setTemplateTriggerKey(e.target.value)} placeholder="trigger_key" />
                <Input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Template description" />
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} placeholder="Email subject" />
              </div>

              <RichTextField
                label="HTML Body"
                value={templateHtml}
                onChange={setTemplateHtml}
                placeholder="Write the HTML email body..."
                minHeight="220px"
              />

              <div className="space-y-2">
                <Label>Plain Text Body</Label>
                <Textarea
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={6}
                  placeholder="Plain text fallback"
                />
              </div>

              <div className="space-y-2">
                <Label>Detected Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No variables detected.</span>
                  ) : (
                    detectedVariables.map((variable) => (
                      <Badge key={variable} variant="outline">{`{{${variable}}}`}</Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preview Subject</Label>
                  <div className="rounded border p-2 text-sm bg-muted/20">{renderedPreview.subject || "—"}</div>
                  <Label className="mt-3 block">Preview HTML</Label>
                  <div className="rounded border p-3 bg-white min-h-[180px]" dangerouslySetInnerHTML={{ __html: renderedPreview.html || "<p>—</p>" }} />
                </div>
                <div className="space-y-2">
                  <Label>Preview Plain Text</Label>
                  <div className="rounded border p-2 text-xs whitespace-pre-wrap bg-muted/20 min-h-[140px]">
                    {renderedPreview.text || "—"}
                  </div>
                  <Label>Test Email Address</Label>
                  <Input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="name@company.com"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSendTemplateTest}
                    disabled={!testEmailTo.trim() || sendEmailTemplateTest.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" /> Send Test Email
                  </Button>
                </div>
              </div>

              <Button onClick={handleSaveTemplate} disabled={upsertEmailTemplate.isPending || !templateName.trim() || !templateTriggerKey.trim()}>
                Save Template
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={open.report} onOpenChange={(value) => setOpen((prev) => ({ ...prev, report: value }))}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between text-left">
                <CardTitle className="text-sm font-semibold">Report Schedule</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${open.report ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Label className="text-sm mb-2 block">Auto-generate PDF reports</Label>
              <Select
                value={reportSchedule}
                onValueChange={(v) => {
                  setReportSchedule(v);
                  setDirty(true);
                }}
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Button
        onClick={handleSaveSettings}
        disabled={!dirty || updateSettings.isPending || saveSettingsBatch.isPending}
        className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
      >
        <Save className="w-4 h-4" />
        {updateSettings.isPending || saveSettingsBatch.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
