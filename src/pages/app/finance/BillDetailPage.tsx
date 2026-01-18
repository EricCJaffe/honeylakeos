import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Loader2, CheckCircle, XCircle, DollarSign, Building2, FileText, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBill, useBillMutations, BillStatus } from "@/hooks/useBills";
import { AttachmentsPanel } from "@/components/attachments";

function getStatusBadgeVariant(status: BillStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "approved":
      return "secondary";
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

export default function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = useBill(billId);
  const { updateBillStatus } = useBillMutations();

  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showPayDialog, setShowPayDialog] = React.useState(false);
  const [showVoidDialog, setShowVoidDialog] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [paymentReference, setPaymentReference] = React.useState("");

  const handleApprove = async () => {
    if (!bill) return;
    await updateBillStatus.mutateAsync({ id: bill.id, status: "approved" });
    setShowApproveDialog(false);
  };

  const handlePay = async () => {
    if (!bill) return;
    await updateBillStatus.mutateAsync({
      id: bill.id,
      status: "paid",
      paymentInfo: {
        method: paymentMethod || undefined,
        reference: paymentReference || undefined,
      },
    });
    setShowPayDialog(false);
  };

  const handleVoid = async () => {
    if (!bill) return;
    await updateBillStatus.mutateAsync({ id: bill.id, status: "voided" });
    setShowVoidDialog(false);
  };

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container py-6 max-w-4xl text-center">
        <h2 className="text-xl font-bold mb-2">Bill not found</h2>
        <Button variant="outline" onClick={() => navigate("/app/finance/bills")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bills
        </Button>
      </div>
    );
  }

  const lines = bill.bill_lines || [];

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title={`Bill ${bill.bill_number}`}
        description={`Vendor: ${bill.vendor?.name || "Unknown"}`}
        backHref="/app/finance/bills"
      >
        {bill.status === "draft" && (
          <>
            <Button variant="outline" onClick={() => navigate(`/app/finance/bills/${bill.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={() => setShowApproveDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </>
        )}
        {bill.status === "approved" && (
          <>
            <Button variant="outline" onClick={() => setShowVoidDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Void
            </Button>
            <Button onClick={() => setShowPayDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Mark Paid
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Bill Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bill Details
                </CardTitle>
                <Badge variant={getStatusBadgeVariant(bill.status)}>
                  {bill.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bill Date</p>
                  <p className="font-medium">{format(new Date(bill.bill_date), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(bill.due_date), "MMMM d, yyyy")}</p>
                </div>
              </div>
              {bill.memo && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Memo</p>
                  <p>{bill.memo}</p>
                </div>
              )}
              {bill.payment_date && (
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                  <div>
                    <p className="text-muted-foreground">Payment Date</p>
                    <p className="font-medium">{format(new Date(bill.payment_date), "MMMM d, yyyy")}</p>
                  </div>
                  {bill.payment_method && (
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{bill.payment_method}</p>
                    </div>
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
                    <div className="col-span-2">Description</div>
                    <div className="text-right">Qty × Price</div>
                    <div className="text-right">Amount</div>
                  </div>
                  <Separator />
                  {lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-4 gap-4 text-sm">
                      <div className="col-span-2">{line.description || "No description"}</div>
                      <div className="text-right text-muted-foreground">
                        {line.quantity} × {formatCurrency(line.unit_price)}
                      </div>
                      <div className="text-right font-medium">{formatCurrency(line.amount)}</div>
                    </div>
                  ))}
                  <Separator />
                  <div className="grid grid-cols-4 gap-4 text-sm font-bold">
                    <div className="col-span-3 text-right">Total</div>
                    <div className="text-right">{formatCurrency(bill.total_amount)}</div>
                  </div>
                  {bill.status === "paid" && (
                    <div className="grid grid-cols-4 gap-4 text-sm text-green-600">
                      <div className="col-span-3 text-right">Paid</div>
                      <div className="text-right">{formatCurrency(bill.amount_paid)}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <AttachmentsPanel entityType="bill" entityId={bill.id} title="Bill Attachments" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{bill.vendor?.name || "Unknown"}</p>
              {bill.vendor?.email && (
                <p className="text-sm text-muted-foreground">{bill.vendor.email}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(bill.subtotal_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(bill.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(bill.total_amount)}</span>
              </div>
              {bill.balance_due !== null && bill.balance_due > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Balance Due</span>
                  <span>{formatCurrency(bill.balance_due)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this bill? Once approved, it can be marked as paid or voided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>
              {updateBillStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              Recording full payment of {formatCurrency(bill.total_amount)}. Partial payments are not supported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Method (optional)</Label>
              <Input
                placeholder="e.g., Check, ACH, Credit Card"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference # (optional)</Label>
              <Input
                placeholder="e.g., Check number, Transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={updateBillStatus.isPending}>
              {updateBillStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this bill? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {updateBillStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Void Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
