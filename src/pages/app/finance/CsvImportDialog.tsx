import * as React from "react";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFinanceAccountMutations, AccountType, AccountFormData } from "@/hooks/useChartOfAccounts";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string | null;
  account_number: string | null;
  account_type: string | null;
  description: string | null;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

function inferAccountType(value: string): AccountType | null {
  const lower = value.toLowerCase();
  if (lower.includes("asset") || lower.includes("cash") || lower.includes("receivable")) return "asset";
  if (lower.includes("liabil") || lower.includes("payable") || lower.includes("credit card")) return "liability";
  if (lower.includes("equity") || lower.includes("capital") || lower.includes("retained")) return "equity";
  if (lower.includes("income") || lower.includes("revenue") || lower.includes("sales")) return "income";
  if (lower.includes("expense") || lower.includes("cost")) return "expense";
  return null;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { importAccounts } = useFinanceAccountMutations();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [step, setStep] = React.useState<"upload" | "mapping" | "preview">("upload");
  const [fileName, setFileName] = React.useState<string>("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    name: null,
    account_number: null,
    account_type: null,
    description: null,
  });
  const [defaultType, setDefaultType] = React.useState<AccountType>("expense");
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text);
      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-detect mappings
      const autoMapping: ColumnMapping = {
        name: null,
        account_number: null,
        account_type: null,
        description: null,
      };

      parsedHeaders.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes("name") || lower === "account") autoMapping.name = h;
        if (lower.includes("number") || lower === "code" || lower === "id") autoMapping.account_number = h;
        if (lower.includes("type") || lower.includes("category")) autoMapping.account_type = h;
        if (lower.includes("desc")) autoMapping.description = h;
      });

      setMapping(autoMapping);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string | null) => {
    setMapping(prev => ({ ...prev, [field]: value === "_none_" ? null : value }));
  };

  const validateAndPreview = () => {
    const newErrors: string[] = [];
    
    if (!mapping.name) {
      newErrors.push("Name column is required");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setStep("preview");
  };

  const getMappedAccounts = (): AccountFormData[] => {
    return rows.map(row => {
      let accountType = defaultType;
      
      if (mapping.account_type && row[mapping.account_type]) {
        const inferred = inferAccountType(row[mapping.account_type]);
        if (inferred) accountType = inferred;
      }

      return {
        name: mapping.name ? row[mapping.name] : "",
        account_number: mapping.account_number ? row[mapping.account_number] : null,
        account_type: accountType,
        description: mapping.description ? row[mapping.description] : null,
      };
    }).filter(a => a.name); // Filter out empty rows
  };

  const handleImport = async () => {
    const accounts = getMappedAccounts();
    await importAccounts.mutateAsync(accounts);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({ name: null, account_number: null, account_type: null, description: null });
    setErrors([]);
  };

  const previewAccounts = step === "preview" ? getMappedAccounts() : [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Chart of Accounts</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with your chart of accounts"}
            {step === "mapping" && "Map your CSV columns to account fields"}
            {step === "preview" && "Review the accounts to be imported"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-8">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">Click to upload CSV</p>
              <p className="text-sm text-muted-foreground">
                or drag and drop your file here
              </p>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{fileName}</Badge>
              <span>{rows.length} rows detected</span>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.map((e, i) => <div key={i}>{e}</div>)}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name Column *</Label>
                  <Select value={mapping.name || "_none_"} onValueChange={(v) => handleMappingChange("name", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Account Number Column</Label>
                  <Select value={mapping.account_number || "_none_"} onValueChange={(v) => handleMappingChange("account_number", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Type Column</Label>
                  <Select value={mapping.account_type || "_none_"} onValueChange={(v) => handleMappingChange("account_type", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description Column</Label>
                  <Select value={mapping.description || "_none_"} onValueChange={(v) => handleMappingChange("description", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Default Account Type (for unmapped rows)</Label>
                <Select value={defaultType} onValueChange={(v) => setDefaultType(v as AccountType)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">{previewAccounts.length} accounts ready to import</span>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewAccounts.slice(0, 20).map((a, i) => (
                    <tr key={i}>
                      <td className="p-2 text-muted-foreground">{a.account_number || "-"}</td>
                      <td className="p-2">{a.name}</td>
                      <td className="p-2 capitalize">{a.account_type}</td>
                    </tr>
                  ))}
                  {previewAccounts.length > 20 && (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-muted-foreground">
                        ... and {previewAccounts.length - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={validateAndPreview}>
                Preview Import
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importAccounts.isPending}>
                {importAccounts.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {previewAccounts.length} Accounts
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
