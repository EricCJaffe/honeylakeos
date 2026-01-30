import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useInvoices();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return invoices;
    return invoices.filter((inv) =>
      inv.invoice_number.toLowerCase().includes(qq) ||
      (inv.crm_client?.person_full_name || "").toLowerCase().includes(qq) ||
      (inv.crm_client?.org_name || "").toLowerCase().includes(qq)
    );
  }, [invoices, q]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="Invoices" description="Draft invoices generated from quotes / sales orders" />

      <Card className="p-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoices…" />
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No invoices yet.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inv) => {
            const clientName = inv.crm_client?.person_full_name || inv.crm_client?.org_name || "(No client)";
            return (
              <Link
                key={inv.id}
                to={`/app/finance/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-sm text-muted-foreground">{clientName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>{inv.status}</Badge>
                  <div className="text-sm">${Number(inv.total_amount || 0).toFixed(2)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
