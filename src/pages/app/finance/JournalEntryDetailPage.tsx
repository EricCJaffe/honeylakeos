import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Pencil, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useJournalEntry, useJournalEntryMutations, JournalEntryStatus } from "@/hooks/useJournalEntries";

function getStatusBadgeVariant(status: JournalEntryStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "posted":
      return "default";
    case "draft":
      return "outline";
    case "voided":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function JournalEntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useJournalEntry(entryId);
  const { postEntry, voidEntry } = useJournalEntryMutations();

  const [showPostDialog, setShowPostDialog] = React.useState(false);
  const [showVoidDialog, setShowVoidDialog] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState("");

  const handlePost = async () => {
    if (!entry) return;
    await postEntry.mutateAsync(entry.id);
    setShowPostDialog(false);
  };

  const handleVoid = async () => {
    if (!entry) return;
    await voidEntry.mutateAsync({ id: entry.id, reason: voidReason || undefined });
    setShowVoidDialog(false);
    setVoidReason("");
  };

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="container py-6 max-w-4xl text-center">
        <h2 className="text-xl font-bold mb-2">Journal entry not found</h2>
        <Button variant="outline" onClick={() => navigate("/app/finance/journal")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journal Entries
        </Button>
      </div>
    );
  }

  const lines = entry.lines || [];
  const isBalanced = entry.is_balanced;
  const canPost = entry.status === "draft" && isBalanced;
  const canEdit = entry.status === "draft";
  const canVoid = entry.status === "posted";

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title={`Journal Entry ${entry.entry_number}`}
        description={entry.memo || "No memo"}
        backHref="/app/finance/journal"
      >
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/app/finance/journal/${entry.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {canPost && (
          <Button onClick={() => setShowPostDialog(true)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Post Entry
          </Button>
        )}
        {canVoid && (
          <Button variant="destructive" onClick={() => setShowVoidDialog(true)}>
            <XCircle className="h-4 w-4 mr-2" />
            Void Entry
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Entry Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Entry Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(entry.status)}>
                    {entry.status}
                  </Badge>
                  {!isBalanced && entry.status === "draft" && (
                    <Badge variant="destructive">Unbalanced</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Entry Date</p>
                  <p className="font-medium">{format(new Date(entry.entry_date), "MMMM d, yyyy")}</p>
                </div>
                {entry.posting_date && (
                  <div>
                    <p className="text-muted-foreground">Posting Date</p>
                    <p className="font-medium">{format(new Date(entry.posting_date), "MMMM d, yyyy")}</p>
                  </div>
                )}
              </div>
              {entry.memo && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Memo</p>
                  <p>{entry.memo}</p>
                </div>
              )}
              {entry.voided_at && (
                <div className="text-sm pt-2 border-t">
                  <p className="text-muted-foreground">Voided</p>
                  <p className="font-medium text-destructive">
                    {format(new Date(entry.voided_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                  {entry.void_reason && (
                    <p className="text-sm mt-1">Reason: {entry.void_reason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                    <div className="col-span-2">Account</div>
                    <div className="text-right">Debit</div>
                    <div className="text-right">Credit</div>
                  </div>
                  <Separator />
                  {lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-4 gap-4 text-sm">
                      <div className="col-span-2">
                        <p className="font-medium">
                          {line.account?.account_number && (
                            <span className="text-muted-foreground mr-2">{line.account.account_number}</span>
                          )}
                          {line.account?.name || "Unknown Account"}
                        </p>
                        {line.description && (
                          <p className="text-muted-foreground text-xs">{line.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : "—"}
                      </div>
                      <div className="text-right">
                        {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : "—"}
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="grid grid-cols-4 gap-4 text-sm font-bold">
                    <div className="col-span-2 text-right">Totals</div>
                    <div className="text-right">{formatCurrency(entry.total_debit)}</div>
                    <div className="text-right">{formatCurrency(entry.total_credit)}</div>
                  </div>
                  {!isBalanced && (
                    <div className="grid grid-cols-4 gap-4 text-sm text-destructive font-medium">
                      <div className="col-span-2 text-right">Difference</div>
                      <div className="col-span-2 text-right">
                        {formatCurrency(Math.abs(entry.total_debit - entry.total_credit))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Debits</span>
                <span className="font-medium">{formatCurrency(entry.total_debit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Credits</span>
                <span className="font-medium">{formatCurrency(entry.total_credit)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balanced</span>
                <span className={isBalanced ? "text-green-600" : "text-destructive"}>
                  {isBalanced ? "Yes" : "No"}
                </span>
              </div>
            </CardContent>
          </Card>

          {entry.reference_type && (
            <Card>
              <CardHeader>
                <CardTitle>Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-muted-foreground">Source</p>
                <p className="font-medium capitalize">{entry.reference_type}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Post Dialog */}
      <AlertDialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Journal Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to post this entry? Once posted, it cannot be edited—only voided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost} disabled={postEntry.isPending}>
              {postEntry.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Post Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Journal Entry</DialogTitle>
            <DialogDescription>
              This will void the entry and remove its effect from the ledger. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="void-reason">Reason (optional)</Label>
            <Textarea
              id="void-reason"
              placeholder="Enter reason for voiding..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={voidEntry.isPending}>
              {voidEntry.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Void Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
