import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { OverviewTab } from "./components/OverviewTab";
import { TrendsTab } from "./components/TrendsTab";
import { SubmissionsTab } from "./components/SubmissionsTab";
import { AlertsTab } from "./components/AlertsTab";
import { PreviewTab } from "./components/PreviewTab";
import { QuestionsTab } from "./components/QuestionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { PdfExportButton } from "./components/PdfExportButton";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "trends", label: "Leadership" },
  { value: "submissions", label: "Submissions" },
  { value: "alerts", label: "Alerts" },
  { value: "preview", label: "Preview" },
  { value: "questions", label: "Questions" },
  { value: "settings", label: "Settings" },
] as const;

export default function ExitSurveyDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.value === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  function handleTabChange(next: string) {
    setActiveTab(next);
    if (TABS.some((t) => t.value === next)) {
      const params = new URLSearchParams(searchParams);
      params.set("tab", next);
      setSearchParams(params, { replace: true });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Exit Survey"
        description="Patient satisfaction surveys and analytics"
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={<PdfExportButton activeTab={activeTab} />}
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="trends">
            <TrendsTab />
          </TabsContent>
          <TabsContent value="submissions">
            <SubmissionsTab />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsTab />
          </TabsContent>
          <TabsContent value="preview">
            <PreviewTab />
          </TabsContent>
          <TabsContent value="questions">
            <QuestionsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
