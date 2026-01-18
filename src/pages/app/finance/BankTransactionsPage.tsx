import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Filter, CheckCircle, Send, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBankAccount } from "@/hooks/useBankAccounts";
import {
  useBankTransactions,
  useBankTransactionMutations,
  BankTransaction,
  BankTransactionStatus,
} from "@/hooks/useBankTransactions";
import { useActiveFinanceAccounts } from "@/hooks/useChartOfAccounts";
import { useVendors } from "@/hooks/useVendors";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getStatusBadgeVariant(status: BankTransactionStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "posted":
      return "default";
    case "matched":
      return "secondary";
    case "excluded":
      return "destructive";
    default:
      return "outline";
  }
}

export default function BankTransactionsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BankTransactionStatus | "all">("all");
  const [selectedTxn, setSelectedTxn] = React.useState<BankTransaction | null>(null);

  const { data: account, isLoading: loadingAccount } = useBankAccount(accountId);
  const { data: transactions = [], isLoading: loadingTxns } = useBankTransactions({
    bankAccountId: accountId,
    status: statusFilter === "all" ? null : statusFilter,
    search: search || null,
  });
  const { data: accounts = [] } = useActiveFinanceAccounts();
  const { data: vendors = [] } = useVendors();
  const { categorize, postTransaction, excludeTransaction } = useBankTransactionMutations();

  // Categorization form state
  const [categoryAccountId, setCategoryAccountId] = React.useState("");
  const [categoryVendorId, setCategoryVendorId] = React.useState("");
  const [categoryNotes, setCategoryNotes] = React.useState("");

  React.useEffect(() => {
    if (selectedTxn) {
      setCategoryAccountId(selectedTxn.matched_account_id || "");
      setCategoryVendorId(selectedTxn.matched_vendor_id || "");
      setCategoryNotes(selectedTxn.notes || "");
    }
  }, [selectedTxn]);

  const handleCategorize = async () => {
    if (!selectedTxn || !categoryAccountId) return;
    await categorize.mutateAsync({
      id: selectedTxn.id,
      data: {
        matched_account_id: categoryAccountId,
        matched_vendor_id: categoryVendorId || null,
        notes: categoryNotes || null,
      },
    });
    setSelectedTxn(null);
  };

  const handlePost = async () => {
    if (!selectedTxn) return;
    // Categorize first if not already
    if (!selectedTxn.matched_account_id && categoryAccountId) {
      await categorize.mutateAsync({
        id: selectedTxn.id,
        data: { matched_account_id: categoryAccountId },
      });
    }
    await postTransaction.mutateAsync(selectedTxn.id);
    setSelectedTxn(null);
  };

  const handleExclude = async (id: string) => {
    await excludeTransaction.mutateAsync(id);
  };

  const isLoading = loadingAccount || loadingTxns;

  if (loadingAccount) {
    return (
      <div className="container py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container py-6 text-center">
        <h2 className="text-xl font-bold mb-2">Account not found</h2>
        <Button variant="outline" onClick={() => navigate("/app/finance/banking")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Banking
        </Button>
      </div>
    );
  }

  const unmatchedCount = transactions.filter((t) => t.status === "unmatched").length;
  const matchedCount = transactions.filter((t) => t.status === "matched").length;
  const postedCount = transactions.filter((t) => t.status === "posted").length;

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title={account.name}
        description={`${account.institution_name || "Bank Account"} • ${formatCurrency(account.current_balance)}`}
        backHref="/app/finance/banking"
      >
        <Button variant="outline" onClick={() => navigate(`/app/finance/banking/${accountId}/import`)}>
          Import CSV
        </Button>
      </PageHeader>

      {!account.finance_account_id && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ This account is not mapped to a COA account. You must map it before posting transactions.
          </p>
        </div>
      )}

      <Tabs defaultValue="unmatched" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unmatched">
            Unmatched {unmatchedCount > 0 && <Badge variant="secondary" className="ml-2">{unmatchedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="matched">
            Categorized {matchedCount > 0 && <Badge variant="secondary" className="ml-2">{matchedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="posted">
            Posted {postedCount > 0 && <Badge variant="secondary" className="ml-2">{postedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {["unmatched", "matched", "posted", "all"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <TransactionList
                transactions={transactions.filter((t) =>
                  tab === "all" ? true : t.status === tab
                )}
                onSelect={setSelectedTxn}
                onExclude={handleExclude}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Categorization Sheet */}
      <Sheet open={!!selectedTxn} onOpenChange={() => setSelectedTxn(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Categorize Transaction</SheetTitle>
            <SheetDescription>
              {selectedTxn && (
                <div className="mt-2 space-y-1 text-left">
                  <p className="font-medium text-foreground">{selectedTxn.description}</p>
                  <p className={`text-lg font-bold ${selectedTxn.amount < 0 ? "text-destructive" : "text-green-600"}`}>
                    {formatCurrency(selectedTxn.amount)}
                  </p>
                  <p className="text-sm">{format(new Date(selectedTxn.transaction_date), "MMMM d, yyyy")}</p>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Category Account *</Label>
              <Select value={categoryAccountId} onValueChange={setCategoryAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number ? `${acc.account_number} - ` : ""}
                      {acc.name} ({acc.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendor (optional)</Label>
              <Select value={categoryVendorId} onValueChange={setCategoryVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={categoryNotes}
                onChange={(e) => setCategoryNotes(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleCategorize}
              disabled={!categoryAccountId || categorize.isPending}
              className="w-full sm:w-auto"
            >
              {categorize.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Category
            </Button>
            <Button
              onClick={handlePost}
              disabled={!categoryAccountId || !account.finance_account_id || postTransaction.isPending}
              className="w-full sm:w-auto"
            >
              {postTransaction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-2" />
              Post to Ledger
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TransactionList({
  transactions,
  onSelect,
  onExclude,
}: {
  transactions: BankTransaction[];
  onSelect: (txn: BankTransaction) => void;
  onExclude: (id: string) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="rounded-lg border divide-y">
      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="p-4 hover:bg-muted/30 cursor-pointer flex items-center justify-between gap-4"
          onClick={() => txn.status !== "posted" && txn.status !== "excluded" && onSelect(txn)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{txn.description}</p>
              <Badge variant={getStatusBadgeVariant(txn.status)} className="shrink-0">
                {txn.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(txn.transaction_date), "MMM d, yyyy")}
              {txn.matched_account && ` • ${txn.matched_account.name}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`font-bold ${txn.amount < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(txn.amount)}
            </p>
          </div>
          {txn.status === "unmatched" && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onExclude(txn.id);
              }}
            >
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
