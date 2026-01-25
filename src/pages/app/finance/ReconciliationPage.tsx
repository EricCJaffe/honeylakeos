import * as React from "react";
import { Plus, Scale, CheckCircle, MoreHorizontal, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankReconciliations, useBankReconciliationMutations, ReconciliationFormData } from "@/hooks/useBankReconciliation";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const { data: accounts = [] } = useBankAccounts();
  const { data: reconciliations = [], isLoading } = useBankReconciliations();
  const { startReconciliation } = useBankReconciliationMutations();

  const [showNewDialog, setShowNewDialog] = React.useState(false);
  const [formData, setFormData] = React.useState<ReconciliationFormData>({
    bank_account_id: "",
    statement_date: format(new Date(), "yyyy-MM-dd"),
    statement_ending_balance: 0,
  });

  const handleStart = async () => {
    const result = await startReconciliation.mutateAsync(formData);
    setShowNewDialog(false);
    navigate(`/app/finance/reconciliation/${result.id}`);
  };

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Bank Reconciliation"
        description="Reconcile bank statements with your records"
        actionLabel="New Reconciliation"
        onAction={() => setShowNewDialog(true)}
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : reconciliations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No reconciliations yet</h3>
            <p className="text-muted-foreground mb-4">Start a reconciliation to match your bank statement</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Reconciliation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border divide-y">
          {reconciliations.map((recon) => (
            <div key={recon.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{recon.bank_account?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Statement: {format(new Date(recon.statement_date), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(recon.statement_ending_balance)}</p>
                  <Badge variant={recon.status === "completed" ? "default" : recon.status === "in_progress" ? "secondary" : "destructive"}>
                    {recon.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/app/finance/reconciliation/${recon.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        {recon.status === "in_progress" ? "Continue" : "View"}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Reconciliation</DialogTitle>
            <DialogDescription>Enter your bank statement details to begin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Account *</Label>
              <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.finance_account_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statement Date *</Label>
              <Input type="date" value={formData.statement_date} onChange={(e) => setFormData({ ...formData, statement_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Statement Ending Balance *</Label>
              <Input type="number" step="0.01" value={formData.statement_ending_balance} onChange={(e) => setFormData({ ...formData, statement_ending_balance: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={!formData.bank_account_id || startReconciliation.isPending}>
              Start Reconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
