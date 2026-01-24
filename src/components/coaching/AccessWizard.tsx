import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCompleteOnboardingWizard } from "@/hooks/useCoachingData";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
import { Shield, ArrowRight, Check } from "lucide-react";

interface AccessWizardProps {
  engagement: any;
  onboardingId?: string;
}

const MODULE_OPTIONS = [
  { key: "tasks", label: "Tasks", description: "Allow coach to view/create coaching tasks" },
  { key: "projects", label: "Projects", description: "Allow coach to view/manage coaching projects" },
  { key: "notes", label: "Notes", description: "Allow coach to view/create coaching notes" },
  { key: "calendar", label: "Calendar", description: "Allow coach to view coaching events" },
  { key: "docs", label: "Documents", description: "Allow coach to view shared documents" },
];

export function AccessWizard({ engagement, onboardingId }: AccessWizardProps) {
  const { getTerm } = useCoachingTerminology(engagement?.coaching_org_id);
  const completeWizard = useCompleteOnboardingWizard();
  
  const [step, setStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    tasks: true,
    projects: true,
    notes: true,
  });

  const handleToggleModule = (key: string) => {
    setSelectedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleComplete = async () => {
    if (!onboardingId) return;

    const grants = Object.entries(selectedModules)
      .filter(([_, enabled]) => enabled)
      .map(([module]) => ({
        module,
        role: "write",
        coaching_scoped_only: true,
      }));

    // Always include coaching module
    grants.push({
      module: "coaching",
      role: "admin",
      coaching_scoped_only: true,
    });

    await completeWizard.mutateAsync({
      onboardingId,
      engagementId: engagement.id,
      grants,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center">
        <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold">Configure {getTerm("coach_label")} Access</h1>
        <p className="text-muted-foreground mt-2">
          Set up what your {getTerm("coach_label").toLowerCase()} can access in your organization
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {getTerm("module_label")}</CardTitle>
            <CardDescription>
              Your organization has been connected with {engagement.coaching_org?.name}. 
              Before your coach can help you, you need to configure what they can access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Default Access (Always Enabled)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {getTerm("module_label")} plans, goals, and meetings</li>
                <li>• {getTerm("health_check_label")}s and assessments</li>
                <li>• Coaching-specific tasks and notes</li>
              </ul>
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Optional Module Access</CardTitle>
            <CardDescription>
              Select which additional modules your coach can access. 
              All access is scoped to coaching-related items only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MODULE_OPTIONS.map((module) => (
              <div key={module.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={module.key}
                  checked={selectedModules[module.key] || false}
                  onCheckedChange={() => handleToggleModule(module.key)}
                />
                <div className="flex-1">
                  <Label htmlFor={module.key} className="font-medium cursor-pointer">
                    {module.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Access Settings</CardTitle>
            <CardDescription>
              Review the access you're granting to your coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Your coach will have access to:</h4>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  {getTerm("module_label")} (Plans, Goals, Meetings, Health Checks)
                </li>
                {Object.entries(selectedModules)
                  .filter(([_, enabled]) => enabled)
                  .map(([key]) => {
                    const module = MODULE_OPTIONS.find((m) => m.key === key);
                    return (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {module?.label} (coaching-scoped only)
                      </li>
                    );
                  })}
              </ul>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={completeWizard.isPending}
                className="flex-1"
              >
                {completeWizard.isPending ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
