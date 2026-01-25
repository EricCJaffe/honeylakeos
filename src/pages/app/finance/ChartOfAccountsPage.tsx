import * as React from "react";
import { Search, Plus, MoreHorizontal, Pencil, Ban, CheckCircle, Calculator, Upload, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useFinanceAccounts,
  useFinanceAccountMutations,
  FinanceAccount,
  AccountType,
} from "@/hooks/useChartOfAccounts";
import { AccountFormDialog } from "./AccountFormDialog";
import { CoaSetupDialog } from "./CoaSetupDialog";
import { CsvImportDialog } from "./CsvImportDialog";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

const ACCOUNT_TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  liability: "bg-red-500/10 text-red-700 dark:text-red-400",
  equity: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  income: "bg-green-500/10 text-green-700 dark:text-green-400",
  expense: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export default function ChartOfAccountsPage() {
  const { data: accounts = [], isLoading } = useFinanceAccounts();
  const { deactivateAccount } = useFinanceAccountMutations();
  
  const [search, setSearch] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<FinanceAccount | null>(null);
  const [deactivatingAccount, setDeactivatingAccount] = React.useState<FinanceAccount | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showSetupDialog, setShowSetupDialog] = React.useState(false);
  const [showImportDialog, setShowImportDialog] = React.useState(false);

  const hasAccounts = accounts.length > 0;

  // Filter and group accounts
  const filteredAccounts = accounts.filter((a) => {
    if (!showInactive && !a.is_active) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(searchLower) ||
        a.account_number?.toLowerCase().includes(searchLower) ||
        a.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const groupedAccounts = ACCOUNT_TYPE_ORDER.reduce((groups, type) => {
    groups[type] = filteredAccounts.filter((a) => a.account_type === type);
    return groups;
  }, {} as Record<AccountType, FinanceAccount[]>);

  const handleDeactivate = async () => {
    if (!deactivatingAccount) return;
    await deactivateAccount.mutateAsync(deactivatingAccount.id);
    setDeactivatingAccount(null);
  };

  if (isLoading) {
    return (
      <div className="container py-6 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Show setup prompt if no accounts exist
  if (!hasAccounts) {
    return (
      <div className="container py-6 max-w-4xl">
        <PageHeader
          title="Chart of Accounts"
          description="Set up your chart of accounts to categorize transactions"
        />

        <Card className="mt-8">
          <CardHeader className="text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Set Up Your Chart of Accounts</CardTitle>
            <CardDescription>
              A chart of accounts is required to categorize your financial transactions.
              You can start with a template or import your own.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => setShowSetupDialog(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Use Template
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </CardContent>
        </Card>

        <CoaSetupDialog open={showSetupDialog} onOpenChange={setShowSetupDialog} />
        <CsvImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Chart of Accounts"
        description={`${accounts.filter(a => a.is_active).length} active accounts`}
        actionLabel="Add Account"
        onAction={() => setShowCreateDialog(true)}
      />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Show inactive
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      <div className="space-y-6">
        {ACCOUNT_TYPE_ORDER.map((type) => {
          const typeAccounts = groupedAccounts[type];
          if (typeAccounts.length === 0) return null;

          return (
            <Card key={type}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="secondary" className={ACCOUNT_TYPE_COLORS[type]}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </Badge>
                  <span className="text-muted-foreground font-normal text-sm">
                    ({typeAccounts.length} account{typeAccounts.length !== 1 ? "s" : ""})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {typeAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between py-3 ${!account.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {account.account_number && (
                          <span className="text-sm font-mono text-muted-foreground w-16 shrink-0">
                            {account.account_number}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{account.name}</p>
                          {account.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {account.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!account.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {account.is_active && !account.is_system && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeactivatingAccount(account)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AccountFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AccountFormDialog
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount || undefined}
      />

      <CsvImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

      <AlertDialog open={!!deactivatingAccount} onOpenChange={() => setDeactivatingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deactivatingAccount?.name}"? 
              This will hide it from account selections but preserve historical data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
