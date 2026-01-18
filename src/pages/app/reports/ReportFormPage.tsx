import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Users,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import {
  useCreateReport,
  REPORT_CATEGORIES,
  ReportType,
  ReportConfig,
} from "@/hooks/useReports";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  work: CheckCircle2,
  relationships: Users,
  finance: CreditCard,
};

// Map report types to required modules
const REPORT_MODULE_MAP: Record<ReportType, string[]> = {
  tasks_by_status: ["tasks"],
  tasks_by_assignee: ["tasks"],
  tasks_due_soon: ["tasks"],
  tasks_overdue: ["tasks"],
  projects_by_phase: ["projects"],
  projects_active_completed: ["projects"],
  crm_pipeline_totals: ["sales"],
  crm_opportunities_won_lost: ["sales"],
  donors_by_campaign: ["donors"],
  donor_retention: ["donors"],
  invoices_by_status: ["finance"],
  payments_summary: ["finance"],
  receipts_by_tag: ["finance"],
  ar_aging: ["finance"],
};

type Step = "type" | "config" | "details";

function ReportFormContent() {
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const { isEnabled } = useCompanyModules();

  const [step, setStep] = React.useState<Step>("type");
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<ReportType | null>(null);
  const [config, setConfig] = React.useState<ReportConfig>({});
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isPersonal, setIsPersonal] = React.useState(false);

  // Filter categories based on enabled modules
  const availableCategories = REPORT_CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter((t) => {
      const requiredModules = REPORT_MODULE_MAP[t.value];
      return requiredModules.every((m) => isEnabled(m as any));
    }),
  })).filter((cat) => cat.types.length > 0);

  const handleNext = () => {
    if (step === "type" && selectedType) {
      setStep("config");
    } else if (step === "config") {
      setStep("details");
      // Auto-generate name if empty
      if (!name) {
        const typeLabel = REPORT_CATEGORIES
          .flatMap((c) => c.types)
          .find((t) => t.value === selectedType)?.label;
        setName(typeLabel || "New Report");
      }
    }
  };

  const handleBack = () => {
    if (step === "config") {
      setStep("type");
    } else if (step === "details") {
      setStep("config");
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !name) return;

    await createReport.mutateAsync({
      name,
      description: description || null,
      is_personal: isPersonal,
      report_type: selectedType,
      config_json: config,
      owner_user_id: null,
    });

    navigate("/app/reports");
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Create Report"
        description="Set up a new analytics report"
      >
        <Button variant="outline" onClick={() => navigate("/app/reports")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </PageHeader>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          step === "type" ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <span className="font-medium">1.</span> Report Type
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          step === "config" ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <span className="font-medium">2.</span> Configuration
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          step === "details" ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <span className="font-medium">3.</span> Details
        </div>
      </div>

      {/* Step 1: Report Type */}
      {step === "type" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {availableCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.key] || BarChart3;
              return (
                <Card
                  key={cat.key}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedCategory === cat.key
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setSelectedType(null);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{cat.label}</CardTitle>
                    </div>
                    <CardDescription>{cat.types.length} report types</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Report Type</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedType || ""}
                  onValueChange={(v) => setSelectedType(v as ReportType)}
                >
                  <div className="grid gap-3">
                    {availableCategories
                      .find((c) => c.key === selectedCategory)
                      ?.types.map((t) => (
                        <div key={t.value} className="flex items-center space-x-3">
                          <RadioGroupItem value={t.value} id={t.value} />
                          <Label htmlFor={t.value} className="cursor-pointer">
                            {t.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={handleNext} disabled={!selectedType}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === "config" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date Range (Optional)</CardTitle>
              <CardDescription>
                Filter data by date range for time-based reports
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !config.dateRange?.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange?.start
                        ? format(new Date(config.dateRange.start), "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={config.dateRange?.start ? new Date(config.dateRange.start) : undefined}
                      onSelect={(date) =>
                        setConfig((c) => ({
                          ...c,
                          dateRange: {
                            ...c.dateRange,
                            start: date?.toISOString() || "",
                            end: c.dateRange?.end || "",
                          },
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !config.dateRange?.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange?.end
                        ? format(new Date(config.dateRange.end), "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={config.dateRange?.end ? new Date(config.dateRange.end) : undefined}
                      onSelect={(date) =>
                        setConfig((c) => ({
                          ...c,
                          dateRange: {
                            ...c.dateRange,
                            start: c.dateRange?.start || "",
                            end: date?.toISOString() || "",
                          },
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Details</CardTitle>
              <CardDescription>
                Give your report a name and choose visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Report Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Task Summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description for this report"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Personal Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Only you can see this report
                  </p>
                </div>
                <Switch
                  checked={isPersonal}
                  onCheckedChange={setIsPersonal}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!name || createReport.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createReport.isPending ? "Saving..." : "Create Report"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportFormPage() {
  return (
    <ModuleGuard moduleKey="reports" moduleName="Reports">
      <ReportFormContent />
    </ModuleGuard>
  );
}
