import * as React from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCoaTemplates, useFinanceAccountMutations, CoaTemplate } from "@/hooks/useChartOfAccounts";

interface CoaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoaSetupDialog({ open, onOpenChange }: CoaSetupDialogProps) {
  const { data: templates = [], isLoading } = useCoaTemplates();
  const { applyTemplate } = useFinanceAccountMutations();
  const [selectedTemplate, setSelectedTemplate] = React.useState<CoaTemplate | null>(null);

  const handleApply = async () => {
    if (!selectedTemplate) return;
    await applyTemplate.mutateAsync(selectedTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Chart of Accounts Template</DialogTitle>
          <DialogDescription>
            Select a template to quickly set up your chart of accounts. You can customize it later.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {template.template_json.length} accounts
                    </span>
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {["asset", "liability", "equity", "income", "expense"].map((type) => {
                      const count = template.template_json.filter((a) => a.account_type === type).length;
                      if (count === 0) return null;
                      return (
                        <Badge key={type} variant="outline" className="capitalize">
                          {type}: {count}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate || applyTemplate.isPending}
          >
            {applyTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
