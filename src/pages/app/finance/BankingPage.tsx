import * as React from "react";
import { Plus, Landmark, MoreHorizontal, Settings, ArrowRight, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts, useBankAccountMutations, BankAccountFormData } from "@/hooks/useBankAccounts";
import { useActiveFinanceAccounts } from "@/hooks/useChartOfAccounts";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function BankingPage() {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useBankAccounts();
  const { data: coaAccounts = [] } = useActiveFinanceAccounts();
  const { createAccount, mapToCoa } = useBankAccountMutations();

  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showMapDialog, setShowMapDialog] = React.useState<string | null>(null);
  const [newAccount, setNewAccount] = React.useState<BankAccountFormData>({
    name: "",
    institution_name: "",
    account_type: "checking",
    current_balance: 0,
  });
  const [selectedCoaAccount, setSelectedCoaAccount] = React.useState("");

  const bankingCoaAccounts = coaAccounts.filter((a) => a.account_type === "asset");

  const handleAddAccount = async () => {
    await createAccount.mutateAsync(newAccount);
    setShowAddDialog(false);
    setNewAccount({ name: "", institution_name: "", account_type: "checking", current_balance: 0 });
  };

  const handleMapAccount = async () => {
    if (!showMapDialog || !selectedCoaAccount) return;
    await mapToCoa.mutateAsync({ id: showMapDialog, financeAccountId: selectedCoaAccount });
    setShowMapDialog(null);
    setSelectedCoaAccount("");
  };

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Banking"
        description="Manage bank accounts and transactions"
        actionLabel="Add Account"
        onAction={() => setShowAddDialog(true)}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No bank accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Add a bank account to start tracking transactions
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    {account.institution_name && (
                      <p className="text-sm text-muted-foreground">{account.institution_name}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowMapDialog(account.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Map to COA Account
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/app/finance/banking/${account.id}/import`}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import CSV
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(account.current_balance)}</p>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.finance_account_id ? "default" : "secondary"}>
                      {account.finance_account_id
                        ? `Mapped: ${account.finance_account?.name || "COA Account"}`
                        : "Not Mapped to COA"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/app/finance/banking/${account.id}`)}
                  >
                    View Transactions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>Add a new bank account to track transactions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                placeholder="e.g., Business Checking"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                placeholder="e.g., Chase Bank"
                value={newAccount.institution_name || ""}
                onChange={(e) => setNewAccount({ ...newAccount, institution_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={newAccount.account_type}
                  onValueChange={(v) => setNewAccount({ ...newAccount, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newAccount.current_balance || 0}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, current_balance: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={!newAccount.name || createAccount.isPending}>
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map to COA Dialog */}
      <Dialog open={!!showMapDialog} onOpenChange={() => setShowMapDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map to COA Account</DialogTitle>
            <DialogDescription>
              Select a Cash/Bank account from your Chart of Accounts to link this bank account for posting.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>COA Account (Asset)</Label>
            <Select value={selectedCoaAccount} onValueChange={setSelectedCoaAccount}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select COA account" />
              </SelectTrigger>
              <SelectContent>
                {bankingCoaAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_number ? `${acc.account_number} - ` : ""}
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMapAccount} disabled={!selectedCoaAccount || mapToCoa.isPending}>
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
