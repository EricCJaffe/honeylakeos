import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, Users, Settings2, Rocket, 
  Check, ChevronRight, ChevronLeft, SkipForward, Loader2,
  Info
} from "lucide-react";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { 
  useOnboardingState, 
  useOnboardingMutations, 
  ONBOARDING_STEPS,
  STEP_LABELS,
  type OnboardingStep 
} from "@/hooks/useOnboardingState";
import { useFrameworks, useFramework, useFrameworkMutations, useCompanyActiveFramework } from "@/hooks/useFrameworks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const STEP_ICONS: Record<OnboardingStep, React.ElementType> = {
  select_framework: Layers,
  core_setup: Users,
  activate_components: Settings2,
  final_review: Rocket,
};

export default function FrameworkOnboardingPage() {
  const navigate = useNavigate();
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const { isCompanyAdmin } = useMembership();
  
  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const { initializeOnboarding, updateStep, completeOnboarding, skipOnboarding } = useOnboardingMutations();
  const { data: frameworksData, isLoading: frameworksLoading } = useFrameworks();
  const { data: activeFramework } = useCompanyActiveFramework();

  // Extract system templates from frameworks data
  const systemTemplates = frameworksData?.systemTemplates?.filter(f => f.status === "published") || [];
  const { cloneFramework, adoptFramework } = useFrameworkMutations();

  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [clonedFrameworkId, setClonedFrameworkId] = useState<string | null>(null);
  const { data: frameworkDetails } = useFramework(selectedFrameworkId || undefined);

  // Component activation state
  const [activationChoices, setActivationChoices] = useState({
    createCadenceEvents: false,
    instantiateTemplates: false,
    assignLmsPath: false,
  });

  // Determine current step
  const currentStep = onboardingState?.current_step || "select_framework";
  const completedSteps = onboardingState?.completed_steps || [];
  const isCompleted = !!onboardingState?.completed_at;

  // Initialize onboarding if not exists
  useEffect(() => {
    if (!stateLoading && !onboardingState && activeCompanyId && isCompanyAdmin) {
      initializeOnboarding.mutate(undefined);
    }
  }, [stateLoading, onboardingState, activeCompanyId, isCompanyAdmin]);

  // Set framework from active framework if exists
  useEffect(() => {
    if (activeFramework?.active_framework_id && !selectedFrameworkId) {
      setClonedFrameworkId(activeFramework.active_framework_id);
    }
  }, [activeFramework]);

  const availableSteps = ONBOARDING_STEPS;

  const currentStepIndex = availableSteps.indexOf(currentStep);

  const handleSelectFramework = async (frameworkId: string) => {
    setSelectedFrameworkId(frameworkId);
  };

  const handleCloneAndAdopt = async () => {
    if (!selectedFrameworkId || !activeCompany) return;

    try {
      const framework = systemTemplates.find(f => f.id === selectedFrameworkId);
      const newName = `${activeCompany.name} - ${framework?.name || "Framework"}`;
      
      const newFrameworkId = await cloneFramework.mutateAsync({
        sourceFrameworkId: selectedFrameworkId,
        newName,
        newDescription: `Customized framework for ${activeCompany.name}`,
      });

      setClonedFrameworkId(newFrameworkId);
      await adoptFramework.mutateAsync(newFrameworkId);
      
      await updateStep.mutateAsync({
        currentStep: "core_setup",
        completedStep: "select_framework",
        frameworkId: newFrameworkId,
      });

      toast.success("Framework cloned and activated!");
    } catch (error) {
      console.error("Failed to clone framework:", error);
    }
  };

  const handleNextStep = async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < availableSteps.length) {
      await updateStep.mutateAsync({
        currentStep: availableSteps[nextIndex],
        completedStep: currentStep,
      });
    }
  };

  const handlePrevStep = async () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      await updateStep.mutateAsync({
        currentStep: availableSteps[prevIndex],
      });
    }
  };

  const handleComplete = async () => {
    await completeOnboarding.mutateAsync();
    navigate("/app");
  };

  const handleSkip = async () => {
    await skipOnboarding.mutateAsync();
    navigate("/app");
  };

  if (stateLoading || frameworksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Onboarding Complete!</CardTitle>
            <CardDescription>
              Your company is set up and ready to go.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => navigate("/app")} className="w-full">
              Go to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/framework")}
              className="w-full"
            >
              Edit Framework Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container max-w-4xl py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Framework Onboarding</h1>
              <p className="text-muted-foreground">
                Set up your operating system in a few simple steps
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {availableSteps.map((step, index) => {
              const Icon = STEP_ICONS[step];
              const isActive = step === currentStep;
              const isComplete = completedSteps.includes(step);
              
              return (
                <div key={step} className="flex items-center">
                  {index > 0 && (
                    <div className={`w-8 h-0.5 ${isComplete ? "bg-primary" : "bg-muted"}`} />
                  )}
                  <div 
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActive ? "bg-primary text-primary-foreground" : ""}
                      ${isComplete && !isActive ? "bg-primary/10 text-primary" : ""}
                      ${!isActive && !isComplete ? "text-muted-foreground" : ""}
                    `}
                  >
                    {isComplete && !isActive ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === "select_framework" && (
              <StepSelectFramework
                systemTemplates={systemTemplates}
                selectedFrameworkId={selectedFrameworkId}
                frameworkDetails={frameworkDetails}
                onSelect={handleSelectFramework}
                onCloneAndAdopt={handleCloneAndAdopt}
                isCloning={cloneFramework.isPending || adoptFramework.isPending}
                clonedFrameworkId={clonedFrameworkId}
              />
            )}

            {currentStep === "core_setup" && (
              <StepCoreSetup />
            )}

            {currentStep === "activate_components" && (
              <StepActivateComponents
                frameworkDetails={frameworkDetails}
                activationChoices={activationChoices}
                setActivationChoices={setActivationChoices}
              />
            )}

            {currentStep === "final_review" && (
              <StepFinalReview
                frameworkDetails={frameworkDetails}
                activationChoices={activationChoices}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0 || updateStep.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === "final_review" ? (
            <Button onClick={handleComplete} disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Launch
            </Button>
          ) : (
            <Button
              onClick={handleNextStep}
              disabled={
                updateStep.isPending ||
                (currentStep === "select_framework" && !clonedFrameworkId)
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components

function StepSelectFramework({
  systemTemplates,
  selectedFrameworkId,
  frameworkDetails,
  onSelect,
  onCloneAndAdopt,
  isCloning,
  clonedFrameworkId,
}: {
  systemTemplates: any[];
  selectedFrameworkId: string | null;
  frameworkDetails: any;
  onSelect: (id: string) => void;
  onCloneAndAdopt: () => void;
  isCloning: boolean;
  clonedFrameworkId: string | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Choose Your Framework</h2>
        <p className="text-muted-foreground">
          Select an operating framework to guide your team. You can customize it after adoption.
        </p>
      </div>

      {clonedFrameworkId ? (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            Framework activated! Click Next to continue setup.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4">
            {systemTemplates.map((framework) => (
              <Card
                key={framework.id}
                className={`cursor-pointer transition-all ${
                  selectedFrameworkId === framework.id
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => onSelect(framework.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{framework.name}</CardTitle>
                    {framework.version_label && (
                      <Badge variant="secondary">{framework.version_label}</Badge>
                    )}
                  </div>
                  <CardDescription>{framework.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {selectedFrameworkId && frameworkDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Framework Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Concepts ({frameworkDetails.concepts?.length || 0})</h4>
                  <div className="flex flex-wrap gap-2">
                    {frameworkDetails.concepts?.slice(0, 8).map((c: any) => (
                      <Badge key={c.id} variant="outline">{c.display_name_singular}</Badge>
                    ))}
                    {(frameworkDetails.concepts?.length || 0) > 8 && (
                      <Badge variant="outline">+{frameworkDetails.concepts.length - 8} more</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Cadences ({frameworkDetails.cadences?.length || 0})</h4>
                  <div className="flex flex-wrap gap-2">
                    {frameworkDetails.cadences?.map((c: any) => (
                      <Badge key={c.id} variant="outline">{c.display_name}</Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={onCloneAndAdopt} 
                  disabled={isCloning}
                  className="w-full"
                >
                  {isCloning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Clone & Activate Framework
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StepCoreSetup() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Core Setup</h2>
        <p className="text-muted-foreground">
          Configure your team and roles. You can adjust these later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Invite team members from the Employees section after onboarding completes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can invite team members and assign roles from Company Console to Employees.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function StepActivateComponents({
  frameworkDetails,
  activationChoices,
  setActivationChoices,
}: {
  frameworkDetails: any;
  activationChoices: {
    createCadenceEvents: boolean;
    instantiateTemplates: boolean;
    assignLmsPath: boolean;
  };
  setActivationChoices: React.Dispatch<React.SetStateAction<typeof activationChoices>>;
}) {
  const cadences = frameworkDetails?.cadences || [];
  const templates = frameworkDetails?.templates || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Activate Components</h2>
        <p className="text-muted-foreground">
          Choose which framework components to set up now. All steps are optional.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="cadences"
              checked={activationChoices.createCadenceEvents}
              onCheckedChange={(checked) =>
                setActivationChoices((prev) => ({ ...prev, createCadenceEvents: !!checked }))
              }
            />
            <label htmlFor="cadences" className="cursor-pointer">
              <CardTitle className="text-base">Create Recurring Calendar Events</CardTitle>
              <CardDescription>
                Auto-schedule {cadences.length} cadence meetings (weekly, monthly, quarterly, annual)
              </CardDescription>
            </label>
          </div>
        </CardHeader>
        {activationChoices.createCadenceEvents && cadences.length > 0 && (
          <CardContent className="pt-0">
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {cadences.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.display_name}</span>
                    <Badge variant="outline">{c.frequency_type}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="templates"
              checked={activationChoices.instantiateTemplates}
              onCheckedChange={(checked) =>
                setActivationChoices((prev) => ({ ...prev, instantiateTemplates: !!checked }))
              }
            />
            <label htmlFor="templates" className="cursor-pointer">
              <CardTitle className="text-base">Create Starter Projects & Notes</CardTitle>
              <CardDescription>
                Instantiate {templates.length} framework templates (projects, notes, documents)
              </CardDescription>
            </label>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="lms"
              checked={activationChoices.assignLmsPath}
              onCheckedChange={(checked) =>
                setActivationChoices((prev) => ({ ...prev, assignLmsPath: !!checked }))
              }
            />
            <label htmlFor="lms" className="cursor-pointer">
              <CardTitle className="text-base">Assign Framework Learning Path</CardTitle>
              <CardDescription>
                Enroll leadership team in framework onboarding courses
              </CardDescription>
            </label>
          </div>
        </CardHeader>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These are optional helpers. You can always set these up later from the relevant modules.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function StepFinalReview({
  frameworkDetails,
  activationChoices,
}: {
  frameworkDetails: any;
  activationChoices: {
    createCadenceEvents: boolean;
    instantiateTemplates: boolean;
    assignLmsPath: boolean;
  };
}) {
  const activeChoices = Object.entries(activationChoices)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Ready to Launch!</h2>
        <p className="text-muted-foreground">
          Review your setup and launch your operating system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-medium">{frameworkDetails?.framework?.name || "Selected"}</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Concepts</span>
            <span>{frameworkDetails?.concepts?.length || 0} defined</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Cadences</span>
            <span>{frameworkDetails?.cadences?.length || 0} configured</span>
          </div>

          {activeChoices.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Will be created:</span>
                <ul className="mt-2 space-y-1">
                  {activationChoices.createCadenceEvents && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Recurring calendar events
                    </li>
                  )}
                  {activationChoices.instantiateTemplates && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Starter projects & notes
                    </li>
                  )}
                  {activationChoices.assignLmsPath && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Learning path assignments
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can always change these settings later. Click <strong>Launch</strong> to complete onboarding.
        </AlertDescription>
      </Alert>
    </div>
  );
}
