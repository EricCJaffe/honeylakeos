import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvoice } from "@/hooks/useInvoices";

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Invoice not found.</div>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/app/finance/invoices")}>Back</Button>
      </div>
    );
  }

  const clientName = invoice.crm_client?.person_full_name || invoice.crm_client?.org_name || "(No client)";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader title={invoice.invoice_number} description={clientName} />
        <Button variant="outline" onClick={() => navigate("/app/finance/invoices")}>Back</Button>
      </div>

      <Card className="p-4 grid gap-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Status</div>
          <Badge>{invoice.status}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Issue Date</div>
          <div className="text-sm">{invoice.issue_date}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Due Date</div>
          <div className="text-sm">{invoice.due_date || "—"}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-sm">${Number(invoice.total_amount || 0).toFixed(2)} {invoice.currency}</div>
        </div>
        {invoice.sales_order_id && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Sales Order</div>
            <div className="text-sm">{invoice.sales_order_id}</div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Notes</div>
        <div className="text-sm whitespace-pre-wrap mt-1">{invoice.notes || ""}</div>
      </Card>
    </div>
  );
}
