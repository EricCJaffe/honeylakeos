import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSalesQuotes, useCreateSalesQuote, SalesQuoteType } from "@/hooks/useSalesQuotes";
import { useCrmClients } from "@/hooks/useCrmClients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function StatusBadge({ status }: { status: string }) {
  const variant = status === "won" ? "default" : status === "lost" ? "destructive" : "secondary";
  return <Badge variant={variant as any}>{status}</Badge>;
}

export default function QuotesPage() {
  const navigate = useNavigate();
  const { data: quotes = [], isLoading } = useSalesQuotes();
  const { data: clients = [] } = useCrmClients();
  const createQuote = useCreateSalesQuote();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [quoteType, setQuoteType] = useState<SalesQuoteType>("sow");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return quotes;
    return quotes.filter((x) =>
      x.title.toLowerCase().includes(qq) ||
      (x.crm_client?.person_full_name || "").toLowerCase().includes(qq) ||
      (x.crm_client?.org_name || "").toLowerCase().includes(qq)
    );
  }, [quotes, q]);

  const onCreate = async () => {
    const client = clients.find((c: any) => c.id === clientId);
    const derivedTitle = title.trim() || `Quote — ${client?.person_full_name || client?.org_name || "Client"}`;

    const created = await createQuote.mutateAsync({
      crm_client_id: clientId,
      title: derivedTitle,
      quote_type: quoteType,
    });

    setOpen(false);
    setClientId("");
    setTitle("");
    setQuoteType("sow");

    navigate(`/app/sales/quotes/${created.id}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Quotes" description="Create and manage quotes" />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      <Card className="p-4 flex items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quotes…" />
      </Card>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No quotes yet.</div>
        ) : (
          filtered.map((quote) => {
            const clientName =
              quote.crm_client?.person_full_name || quote.crm_client?.org_name || "(No client)";
            return (
              <Link
                key={quote.id}
                to={`/app/sales/quotes/${quote.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{quote.title}</div>
                    <div className="text-sm text-muted-foreground">{clientName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={quote.status} />
                  <div className="text-xs text-muted-foreground">{quote.quote_type.toUpperCase()}</div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Client (required)</div>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.person_full_name || c.org_name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Type</div>
              <Select value={quoteType} onValueChange={(v) => setQuoteType(v as SalesQuoteType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="psa">PSA</SelectItem>
                  <SelectItem value="sow">SOW</SelectItem>
                  <SelectItem value="combined">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Title (optional)</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quote title" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!clientId || createQuote.isPending} onClick={onCreate}>
              {createQuote.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
