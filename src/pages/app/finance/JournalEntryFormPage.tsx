import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJournalEntry, useJournalEntryMutations, JournalEntryLineFormData } from "@/hooks/useJournalEntries";
import { useActiveFinanceAccounts } from "@/hooks/useChartOfAccounts";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function JournalEntryFormPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const isEditing = !!entryId && entryId !== "new";

  const { data: existingEntry, isLoading: loadingEntry } = useJournalEntry(isEditing ? entryId : undefined);
  const { data: accounts = [] } = useActiveFinanceAccounts();
  const { createEntry, updateEntry } = useJournalEntryMutations();

  const [entryDate, setEntryDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [memo, setMemo] = React.useState("");
  const [lines, setLines] = React.useState<JournalEntryLineFormData[]>([
    { account_id: "", debit_amount: 0, credit_amount: 0 },
    { account_id: "", debit_amount: 0, credit_amount: 0 },
  ]);

  // Load existing entry data
  React.useEffect(() => {
    if (existingEntry) {
      setEntryDate(existingEntry.entry_date);
      setMemo(existingEntry.memo || "");
      setLines(
        (existingEntry.lines || []).map((l) => ({
          id: l.id,
          account_id: l.account_id,
          description: l.description,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
        }))
      );
    }
  }, [existingEntry]);

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  const addLine = () => {
    setLines([...lines, { account_id: "", debit_amount: 0, credit_amount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<JournalEntryLineFormData>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  };

  const handleSave = async () => {
    const validLines = lines.filter((l) => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0));
    if (validLines.length < 2) {
      return;
    }

    const data = { entry_date: entryDate, memo: memo || null, lines: validLines };

    if (isEditing && entryId) {
      await updateEntry.mutateAsync({ id: entryId, data });
    } else {
      await createEntry.mutateAsync(data);
    }
    navigate("/app/finance/journal");
  };

  const isPending = createEntry.isPending || updateEntry.isPending;

  if (isEditing && loadingEntry) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title={isEditing ? "Edit Journal Entry" : "New Journal Entry"}
        description="Create a balanced double-entry transaction"
        backHref="/app/finance/journal"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Memo</Label>
              <Textarea placeholder="Optional description..." value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Account</div>
                <div className="col-span-3">Debit</div>
                <div className="col-span-3">Credit</div>
                <div className="col-span-1"></div>
              </div>
              <Separator />
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select value={line.account_id} onValueChange={(v) => updateLine(index, { account_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.account_number ? `${acc.account_number} - ` : ""}
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.debit_amount || ""}
                      onChange={(e) => updateLine(index, { debit_amount: parseFloat(e.target.value) || 0, credit_amount: 0 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.credit_amount || ""}
                      onChange={(e) => updateLine(index, { credit_amount: parseFloat(e.target.value) || 0, debit_amount: 0 })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="grid grid-cols-12 gap-2 font-bold">
                <div className="col-span-5 text-right">Totals:</div>
                <div className="col-span-3">{formatCurrency(totalDebit)}</div>
                <div className="col-span-3">{formatCurrency(totalCredit)}</div>
                <div className="col-span-1"></div>
              </div>
              {!isBalanced && (
                <div className="text-destructive text-sm text-center">
                  Entry is unbalanced by {formatCurrency(difference)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/app/finance/journal")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || lines.filter((l) => l.account_id).length < 2}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  );
}
