import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBankAccount } from "@/hooks/useBankAccounts";
import { useBankTransactionMutations } from "@/hooks/useBankTransactions";

interface ParsedRow {
  [key: string]: string;
}

export default function BankCsvImportPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { data: account, isLoading: loadingAccount } = useBankAccount(accountId);
  const { importCsvTransactions } = useBankTransactionMutations();

  const [step, setStep] = React.useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [dateColumn, setDateColumn] = React.useState("");
  const [descriptionColumn, setDescriptionColumn] = React.useState("");
  const [amountColumn, setAmountColumn] = React.useState("");
  const [debitColumn, setDebitColumn] = React.useState("");
  const [creditColumn, setCreditColumn] = React.useState("");
  const [importResult, setImportResult] = React.useState<{ imported: number; skipped: number } | null>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return;

    // Parse headers
    const headerLine = lines[0];
    const parsedHeaders = parseCSVLine(headerLine);
    setHeaders(parsedHeaders);

    // Parse rows (first 100 for preview)
    const parsedRows: ParsedRow[] = [];
    for (let i = 1; i < Math.min(lines.length, 101); i++) {
      const values = parseCSVLine(lines[i]);
      const row: ParsedRow = {};
      parsedHeaders.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      parsedRows.push(row);
    }
    setRows(parsedRows);
    setStep("map");
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const isAmountMode = !!amountColumn;
  const isDebitCreditMode = !!debitColumn && !!creditColumn;
  const canProceed = dateColumn && descriptionColumn && (isAmountMode || isDebitCreditMode);

  const getMappedData = (): Array<{ transaction_date: string; description: string; amount: number }> => {
    return rows.map((row) => {
      let amount = 0;
      if (isAmountMode) {
        amount = parseFloat(row[amountColumn]?.replace(/[^0-9.-]/g, "") || "0");
      } else if (isDebitCreditMode) {
        const debit = parseFloat(row[debitColumn]?.replace(/[^0-9.-]/g, "") || "0");
        const credit = parseFloat(row[creditColumn]?.replace(/[^0-9.-]/g, "") || "0");
        amount = credit - debit; // Credits positive, debits negative
      }

      // Parse date
      const rawDate = row[dateColumn];
      let parsedDate = rawDate;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString().split("T")[0];
        }
      } catch {}

      return {
        transaction_date: parsedDate,
        description: row[descriptionColumn] || "",
        amount,
      };
    });
  };

  const handleImport = async () => {
    if (!accountId) return;
    const data = getMappedData();
    const result = await importCsvTransactions.mutateAsync({
      bankAccountId: accountId,
      transactions: data,
    });
    setImportResult(result);
    setStep("done");
  };

  if (loadingAccount) {
    return <div className="container py-6">Loading...</div>;
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

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title="Import Transactions"
        description={`Import CSV transactions to ${account.name}`}
        backHref={`/app/finance/banking/${accountId}`}
      />

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file containing your bank transactions. Any format is supported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Choose a file</span> or drag and drop
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">CSV files only</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to the required fields. Found {rows.length} rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date Column *</Label>
                <Select value={dateColumn} onValueChange={setDateColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description Column *</Label>
                <Select value={descriptionColumn} onValueChange={setDescriptionColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount Handling</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose either a single amount column OR separate debit/credit columns
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Single Amount</Label>
                  <Select value={amountColumn} onValueChange={(v) => { setAmountColumn(v); setDebitColumn(""); setCreditColumn(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Amount column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Debit Column</Label>
                  <Select value={debitColumn} onValueChange={(v) => { setDebitColumn(v); setAmountColumn(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Debit column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Credit Column</Label>
                  <Select value={creditColumn} onValueChange={(v) => { setCreditColumn(v); setAmountColumn(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Credit column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {canProceed && rows.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (first 5 rows)</Label>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMappedData().slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.transaction_date}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                          <TableCell className="text-right">${row.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!canProceed || importCsvTransactions.isPending}>
                {importCsvTransactions.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Upload className="h-4 w-4 mr-2" />
                Import {rows.length} Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <h3 className="text-2xl font-bold mb-2">Import Complete</h3>
            <p className="text-muted-foreground mb-6">
              Imported {importResult.imported} transactions
              {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicates`}
            </p>
            <Button onClick={() => navigate(`/app/finance/banking/${accountId}`)}>
              View Transactions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
