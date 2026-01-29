import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, XCircle, Trophy, Send } from "lucide-react";
import { useSalesQuote, useUpdateSalesQuote, useConvertQuoteToSalesOrder } from "@/hooks/useSalesQuotes";
import { useAttachments, useAttachmentMutations } from "@/hooks/useAttachments";

export default function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();

  const { data: quote, isLoading } = useSalesQuote(quoteId);
  const update = useUpdateSalesQuote();
  const convert = useConvertQuoteToSalesOrder();

  const { data: attachments = [] } = useAttachments("sales_quote", quoteId);
  const { uploadAttachment } = useAttachmentMutations("sales_quote", quoteId || "");

  const clientName = useMemo(() => {
    if (!quote) return "";
    return quote.crm_client?.person_full_name || quote.crm_client?.org_name || "[Client]";
  }, [quote]);

  const [notes, setNotes] = useState<string>("");

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!quote) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Quote not found.</div>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/app/sales/quotes")}>Back</Button>
      </div>
    );
  }

  const setStatus = async (status: any) => {
    const patch: any = { id: quote.id, status };
    const now = new Date().toISOString();
    if (status === "sent") patch.sent_at = now;
    if (status === "signed") patch.signed_at = now;
    if (status === "won") patch.won_at = now;
    if (status === "lost") patch.lost_at = now;
    await update.mutateAsync(patch);
  };

  const onUpload = async (file: File) => {
    await uploadAttachment.mutateAsync(file);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={quote.title}
          description={`${clientName} • ${quote.quote_type.toUpperCase()}`}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/sales/quotes")}>Back</Button>
        </div>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm">Status:</div>
          <Badge>{quote.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setStatus("sent")}>
            <Send className="mr-2 h-4 w-4" /> Mark Sent
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("signed")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Signed
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("lost")}>
            <XCircle className="mr-2 h-4 w-4" /> Mark Lost
          </Button>
          <Button size="sm" onClick={() => setStatus("won")}>
            <Trophy className="mr-2 h-4 w-4" /> Mark Won
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Internal Notes</div>
        <Textarea
          placeholder="Internal notes…"
          value={notes || quote.internal_notes || ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => update.mutate({ id: quote.id, internal_notes: notes })}
          >
            Save Notes
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Attachments (Signed docs, drafts, etc.)</div>
          <label className="inline-flex items-center">
            <Input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
                e.currentTarget.value = "";
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </span>
            </Button>
          </label>
        </div>
        {attachments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No files uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border p-2">
                <div className="text-sm">{a.file_name}</div>
                <div className="text-xs text-muted-foreground">{(a.file_size || 0) / 1024 / 1024 > 1 ? `${((a.file_size || 0) / 1024 / 1024).toFixed(1)} MB` : `${Math.round((a.file_size || 0) / 1024)} KB`}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Convert</div>
          <div className="text-sm text-muted-foreground">Create a Sales Order record from this quote.</div>
        </div>
        <Button
          onClick={() => convert.mutate({ quoteId: quote.id })}
          disabled={convert.isPending}
        >
          {convert.isPending ? "Creating…" : "Create Sales Order"}
        </Button>
      </Card>
    </div>
  );
}
