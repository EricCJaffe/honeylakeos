import * as React from "react";
import { motion } from "framer-motion";
import { CreditCard, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceModeSelector } from "@/components/finance/FinanceModeSelector";
import { FinanceMode } from "@/hooks/useFinanceMode";

interface FinanceModeStepProps {
  value: FinanceMode | null;
  onChange: (mode: FinanceMode) => void;
  onNext: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function FinanceModeStep({ value, onChange, onNext, onBack, isLoading }: FinanceModeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">How do you manage your books?</CardTitle>
          <CardDescription>
            Choose how you'd like to handle financial data. You can change this later in settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FinanceModeSelector value={value} onChange={onChange} disabled={isLoading} />

          <div className="flex items-center justify-between pt-4 border-t">
            {onBack ? (
              <Button variant="ghost" onClick={onBack} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={onNext} disabled={!value || isLoading}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
