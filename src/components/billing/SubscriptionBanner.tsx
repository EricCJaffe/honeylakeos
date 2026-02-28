import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

/**
 * Banner component shown when subscription requires action
 * Per Prompt 11: Shows during grace period and when requires_action
 */
export function SubscriptionBanner() {
  const { data: status, isLoading } = useSubscriptionStatus();
  const navigate = useNavigate();

  if (isLoading || !status) return null;
  if (!status.requiresAction && !status.isGrace) return null;

  const handleUpgrade = () => {
    navigate("/app/admin/plans-usage");
  };

  if (status.isGrace && status.graceDaysRemaining > 0) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10 mb-4">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Grace Period Active
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-700 dark:text-amber-300">
            {status.isProvisionedByCoach
              ? "Your provisioned organization access has ended. "
              : ""}
            You have {status.graceDaysRemaining} days to choose a subscription plan.
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleUpgrade}
            className="ml-4 border-amber-500 text-amber-700 hover:bg-amber-100"
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Choose Plan
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (status.requiresAction) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Subscription Required</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your access may be limited. Please choose a subscription plan to continue.
          </span>
          <Button size="sm" variant="outline" onClick={handleUpgrade} className="ml-4">
            <CreditCard className="h-4 w-4 mr-1" />
            Subscribe Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
