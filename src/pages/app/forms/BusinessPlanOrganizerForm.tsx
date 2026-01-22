import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormByTemplateKey, useCreateFormFromTemplate } from "@/hooks/useFormByTemplateKey";
import { useWfSubmissionMutations } from "@/hooks/useWorkflowForms";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { cn } from "@/lib/utils";

const TEMPLATE_KEY = "generic_business_plan_organizer_v25_07";

interface RockRow {
  rock_title: string;
  associated_strategic_initiative: string;
  person_responsible: string;
  due_date: string;
}

interface ScorecardRow {
  metric_name: string;
  owner: string;
  target: string;
  actual: string;
  status: string;
}

interface FormData {
  // Step 1: Header
  plan_year: number;
  company_name: string;
  last_updated: string;
  
  // Step 2: Annual Strategic Plan
  mission_statement: string;
  vision_statement: string;
  core_values: string;
  statement_of_faith: string;
  ideal_customer_profile: string;
  dominant_selling_idea: string;
  three_uniques_1: string;
  three_uniques_2: string;
  three_uniques_3: string;
  promise: string;
  swot_strengths: string;
  swot_weaknesses: string;
  swot_opportunities: string;
  swot_threats: string;
  issues_list: string;
  bhag_10_year: string;
  outlook_3_year: string;
  primary_initiative_year: string;
  high_level_strategic_plan: string;
  
  // Step 3: Quarterly Rocks
  q1_rocks: RockRow[];
  q2_rocks: RockRow[];
  q3_rocks: RockRow[];
  q4_rocks: RockRow[];
  
  // Step 4: Scorecard
  scorecard_metrics: ScorecardRow[];
}

const emptyRock = (): RockRow => ({
  rock_title: "",
  associated_strategic_initiative: "",
  person_responsible: "",
  due_date: "",
});

const emptyScorecard = (): ScorecardRow => ({
  metric_name: "",
  owner: "",
  target: "",
  actual: "",
  status: "",
});

const STEPS = [
  { id: 1, title: "Document Header" },
  { id: 2, title: "Annual Strategic Plan" },
  { id: 3, title: "Quarterly Rocks" },
  { id: 4, title: "Scorecard" },
  { id: 5, title: "Review & Submit" },
];

export default function BusinessPlanOrganizerForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coachingEngagementId = searchParams.get("engagementId") ?? undefined;
  
  const { activeCompany } = useActiveCompany();
  const { data: form, isLoading: formLoading } = useFormByTemplateKey(TEMPLATE_KEY);
  const createForm = useCreateFormFromTemplate();
  const { submitForm } = useWfSubmissionMutations();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuarter, setActiveQuarter] = useState<1 | 2 | 3 | 4>(1);
  
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];
  
  const [formData, setFormData] = useState<FormData>({
    plan_year: currentYear,
    company_name: activeCompany?.name ?? "",
    last_updated: today,
    mission_statement: "",
    vision_statement: "",
    core_values: "",
    statement_of_faith: "",
    ideal_customer_profile: "",
    dominant_selling_idea: "",
    three_uniques_1: "",
    three_uniques_2: "",
    three_uniques_3: "",
    promise: "",
    swot_strengths: "",
    swot_weaknesses: "",
    swot_opportunities: "",
    swot_threats: "",
    issues_list: "",
    bhag_10_year: "",
    outlook_3_year: "",
    primary_initiative_year: "",
    high_level_strategic_plan: "",
    q1_rocks: Array(5).fill(null).map(() => emptyRock()),
    q2_rocks: Array(5).fill(null).map(() => emptyRock()),
    q3_rocks: Array(5).fill(null).map(() => emptyRock()),
    q4_rocks: Array(5).fill(null).map(() => emptyRock()),
    scorecard_metrics: Array(5).fill(null).map(() => emptyScorecard()),
  });

  // Auto-create form if needed
  useState(() => {
    if (!formLoading && !form && !createForm.isPending) {
      createForm.mutate(TEMPLATE_KEY);
    }
  });

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateRock = (quarter: 1 | 2 | 3 | 4, index: number, field: keyof RockRow, value: string) => {
    const key = `q${quarter}_rocks` as keyof FormData;
    const rocks = [...(formData[key] as RockRow[])];
    rocks[index] = { ...rocks[index], [field]: value };
    updateField(key, rocks);
  };

  const addRock = (quarter: 1 | 2 | 3 | 4) => {
    const key = `q${quarter}_rocks` as keyof FormData;
    updateField(key, [...(formData[key] as RockRow[]), emptyRock()]);
  };

  const removeRock = (quarter: 1 | 2 | 3 | 4, index: number) => {
    const key = `q${quarter}_rocks` as keyof FormData;
    const rocks = (formData[key] as RockRow[]).filter((_, i) => i !== index);
    updateField(key, rocks.length ? rocks : [emptyRock()]);
  };

  const updateScorecard = (index: number, field: keyof ScorecardRow, value: string) => {
    const metrics = [...formData.scorecard_metrics];
    metrics[index] = { ...metrics[index], [field]: value };
    updateField("scorecard_metrics", metrics);
  };

  const addScorecard = () => {
    updateField("scorecard_metrics", [...formData.scorecard_metrics, emptyScorecard()]);
  };

  const removeScorecard = (index: number) => {
    const metrics = formData.scorecard_metrics.filter((_, i) => i !== index);
    updateField("scorecard_metrics", metrics.length ? metrics : [emptyScorecard()]);
  };

  const handleSubmit = async () => {
    if (!form) return;
    
    setIsSubmitting(true);
    try {
      // Build payload with all form data
      const payload = {
        ...formData,
        // Clean up empty rocks
        q1_rocks: formData.q1_rocks.filter(r => r.rock_title.trim()),
        q2_rocks: formData.q2_rocks.filter(r => r.rock_title.trim()),
        q3_rocks: formData.q3_rocks.filter(r => r.rock_title.trim()),
        q4_rocks: formData.q4_rocks.filter(r => r.rock_title.trim()),
        scorecard_metrics: formData.scorecard_metrics.filter(m => m.metric_name.trim()),
      };

      // Submit using the workflow forms hook - store as JSON in a single field
      await submitForm.mutateAsync({
        formId: form.id,
        values: [{ fieldId: "payload", value: payload }],
      });
      
      navigate(`/app/forms/submissions?template=${TEMPLATE_KEY}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formLoading || createForm.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Preparing Business Plan Organizer...</p>
        </div>
      </div>
    );
  }

  const canProceed = currentStep === 1 
    ? formData.plan_year && formData.company_name.trim()
    : true;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-5xl py-6">
          <h1 className="text-2xl font-bold">Business Plan Organizer</h1>
          <p className="text-muted-foreground mt-1">Annual Plan, Quarterly Rocks & Scorecard</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-5xl py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-current/20 text-xs">
                      {step.id}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-border mx-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="container max-w-5xl py-8">
        {/* Step 1: Document Header */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Document Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="plan_year">Plan Year *</Label>
                  <Input
                    id="plan_year"
                    type="number"
                    value={formData.plan_year}
                    onChange={e => updateField("plan_year", parseInt(e.target.value) || currentYear)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={e => updateField("company_name", e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_updated">Last Updated</Label>
                  <Input
                    id="last_updated"
                    type="date"
                    value={formData.last_updated}
                    onChange={e => updateField("last_updated", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Annual Strategic Plan */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Principles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mission Statement</Label>
                  <Textarea
                    value={formData.mission_statement}
                    onChange={e => updateField("mission_statement", e.target.value)}
                    placeholder="Your company's mission..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vision Statement</Label>
                  <Textarea
                    value={formData.vision_statement}
                    onChange={e => updateField("vision_statement", e.target.value)}
                    placeholder="Your company's vision..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Core Values</Label>
                  <Textarea
                    value={formData.core_values}
                    onChange={e => updateField("core_values", e.target.value)}
                    placeholder="List your core values..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statement of Faith</Label>
                  <Textarea
                    value={formData.statement_of_faith}
                    onChange={e => updateField("statement_of_faith", e.target.value)}
                    placeholder="Faith-based principles guiding your business..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Generation Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ideal Customer Profile</Label>
                  <Textarea
                    value={formData.ideal_customer_profile}
                    onChange={e => updateField("ideal_customer_profile", e.target.value)}
                    placeholder="Describe your ideal customer..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dominant Selling Idea</Label>
                  <Textarea
                    value={formData.dominant_selling_idea}
                    onChange={e => updateField("dominant_selling_idea", e.target.value)}
                    placeholder="Your unique value proposition..."
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Three Uniques #1</Label>
                    <Input
                      value={formData.three_uniques_1}
                      onChange={e => updateField("three_uniques_1", e.target.value)}
                      placeholder="First unique differentiator"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Three Uniques #2</Label>
                    <Input
                      value={formData.three_uniques_2}
                      onChange={e => updateField("three_uniques_2", e.target.value)}
                      placeholder="Second unique differentiator"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Three Uniques #3</Label>
                    <Input
                      value={formData.three_uniques_3}
                      onChange={e => updateField("three_uniques_3", e.target.value)}
                      placeholder="Third unique differentiator"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Promise</Label>
                  <Textarea
                    value={formData.promise}
                    onChange={e => updateField("promise", e.target.value)}
                    placeholder="Your promise to customers..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SWOT Analysis</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <Textarea
                    value={formData.swot_strengths}
                    onChange={e => updateField("swot_strengths", e.target.value)}
                    placeholder="Internal strengths..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weaknesses</Label>
                  <Textarea
                    value={formData.swot_weaknesses}
                    onChange={e => updateField("swot_weaknesses", e.target.value)}
                    placeholder="Internal weaknesses..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opportunities</Label>
                  <Textarea
                    value={formData.swot_opportunities}
                    onChange={e => updateField("swot_opportunities", e.target.value)}
                    placeholder="External opportunities..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Threats</Label>
                  <Textarea
                    value={formData.swot_threats}
                    onChange={e => updateField("swot_threats", e.target.value)}
                    placeholder="External threats..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues & Long-term Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Opportunities for Improvement (Issues List)</Label>
                  <Textarea
                    value={formData.issues_list}
                    onChange={e => updateField("issues_list", e.target.value)}
                    placeholder="List issues and opportunities for improvement..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>10-Year BHAG (Big Hairy Audacious Goal)</Label>
                  <Textarea
                    value={formData.bhag_10_year}
                    onChange={e => updateField("bhag_10_year", e.target.value)}
                    placeholder="Your 10-year big goal..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>3-Year Outlook</Label>
                  <Textarea
                    value={formData.outlook_3_year}
                    onChange={e => updateField("outlook_3_year", e.target.value)}
                    placeholder="Where you want to be in 3 years..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Initiative for {formData.plan_year}</Label>
                  <Textarea
                    value={formData.primary_initiative_year}
                    onChange={e => updateField("primary_initiative_year", e.target.value)}
                    placeholder="The single most important initiative for this year..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High-Level Strategic Plan</Label>
                  <Textarea
                    value={formData.high_level_strategic_plan}
                    onChange={e => updateField("high_level_strategic_plan", e.target.value)}
                    placeholder="Overview of your strategic approach..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Quarterly Rocks */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Rocks</CardTitle>
              <div className="flex gap-2 mt-4">
                {([1, 2, 3, 4] as const).map(q => (
                  <Button
                    key={q}
                    variant={activeQuarter === q ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveQuarter(q)}
                  >
                    Q{q}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                  <div className="col-span-3">Rock Title *</div>
                  <div className="col-span-3">Strategic Initiative</div>
                  <div className="col-span-2">Person Responsible</div>
                  <div className="col-span-2">Due Date</div>
                  <div className="col-span-2"></div>
                </div>
                
                {(formData[`q${activeQuarter}_rocks` as keyof FormData] as RockRow[]).map((rock, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">
                      <Input
                        value={rock.rock_title}
                        onChange={e => updateRock(activeQuarter, index, "rock_title", e.target.value)}
                        placeholder="Rock title"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={rock.associated_strategic_initiative}
                        onChange={e => updateRock(activeQuarter, index, "associated_strategic_initiative", e.target.value)}
                        placeholder="Strategic initiative"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={rock.person_responsible}
                        onChange={e => updateRock(activeQuarter, index, "person_responsible", e.target.value)}
                        placeholder="Owner"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="date"
                        value={rock.due_date}
                        onChange={e => updateRock(activeQuarter, index, "due_date", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRock(activeQuarter, index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" onClick={() => addRock(activeQuarter)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rock
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Scorecard */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Scorecard Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                  <div className="col-span-3">Metric Name *</div>
                  <div className="col-span-2">Owner</div>
                  <div className="col-span-2">Target</div>
                  <div className="col-span-2">Actual</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1"></div>
                </div>
                
                {formData.scorecard_metrics.map((metric, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">
                      <Input
                        value={metric.metric_name}
                        onChange={e => updateScorecard(index, "metric_name", e.target.value)}
                        placeholder="Metric name"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={metric.owner}
                        onChange={e => updateScorecard(index, "owner", e.target.value)}
                        placeholder="Owner"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={metric.target}
                        onChange={e => updateScorecard(index, "target", e.target.value)}
                        placeholder="Target"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={metric.actual}
                        onChange={e => updateScorecard(index, "actual", e.target.value)}
                        placeholder="Actual"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={metric.status}
                        onValueChange={value => updateScorecard(index, "status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                          <SelectItem value="off_track">Off Track</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScorecard(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" onClick={addScorecard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Business Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Header Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Document Header</h3>
                  <div className="grid gap-2 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><span className="text-muted-foreground">Plan Year:</span> {formData.plan_year}</div>
                    <div><span className="text-muted-foreground">Company:</span> {formData.company_name}</div>
                    <div><span className="text-muted-foreground">Last Updated:</span> {formData.last_updated}</div>
                  </div>
                </div>

                {/* Annual Plan Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Annual Strategic Plan</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                    {formData.mission_statement && (
                      <div><span className="text-muted-foreground">Mission:</span> {formData.mission_statement}</div>
                    )}
                    {formData.vision_statement && (
                      <div><span className="text-muted-foreground">Vision:</span> {formData.vision_statement}</div>
                    )}
                    {formData.primary_initiative_year && (
                      <div><span className="text-muted-foreground">Primary Initiative:</span> {formData.primary_initiative_year}</div>
                    )}
                  </div>
                </div>

                {/* Rocks Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Quarterly Rocks</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([1, 2, 3, 4] as const).map(q => {
                      const rocks = (formData[`q${q}_rocks` as keyof FormData] as RockRow[]).filter(r => r.rock_title.trim());
                      return (
                        <div key={q} className="bg-muted/50 p-4 rounded-lg">
                          <div className="font-medium mb-2">Q{q} ({rocks.length} rocks)</div>
                          {rocks.length > 0 ? (
                            <ul className="text-sm space-y-1">
                              {rocks.slice(0, 3).map((r, i) => (
                                <li key={i} className="text-muted-foreground">• {r.rock_title}</li>
                              ))}
                              {rocks.length > 3 && (
                                <li className="text-muted-foreground">...and {rocks.length - 3} more</li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No rocks added</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scorecard Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Scorecard</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {formData.scorecard_metrics.filter(m => m.metric_name.trim()).length} metrics defined
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < 5 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Business Plan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
