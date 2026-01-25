import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFinancialImports, useFinancialCategories, useFinancialStatementLines, useOpenArItems, useOpenApItems, ImportType, CategoryType } from "@/hooks/useFinancialInsights";
import { useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { Upload, AlertCircle, Check, Plus } from "lucide-react";
import { toast } from "sonner";

interface InsightsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportType;
}

type Step = "upload" | "map" | "review";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  category?: string;
  amount?: string;
  name?: string;
  invoiceNumber?: string;
  dueDate?: string;
  amountDue?: string;
}

interface CategoryMapping {
  originalCategory: string;
  mappedCategoryId: string | null;
}

const importTypeLabels: Record<ImportType, string> = {
  pl: "P&L Statement",
  balance_sheet: "Balance Sheet",
  open_ar: "Open AR",
  open_ap: "Open AP",
};

export function InsightsImportDialog({ open, onOpenChange, importType }: InsightsImportDialogProps) {
  const { createImport, completeImport, failImport } = useFinancialImports();
  const { categories, createCategory } = useFinancialCategories();
  const { insertLines } = useFinancialStatementLines();
  const { insertItems: insertArItems } = useOpenArItems();
  const { insertItems: insertApItems } = useOpenApItems();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const isStatementType = importType === "pl" || importType === "balance_sheet";

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setCategoryMappings([]);
    setPeriodStart(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setPeriodEnd(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setIsProcessing(false);
    setNewCategoryName("");
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: ParsedRow = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const text = await selectedFile.text();
    const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text);

    setHeaders(parsedHeaders);
    setRows(parsedRows);

    // Auto-detect common column names
    const mapping: ColumnMapping = {};
    for (const h of parsedHeaders) {
      const lower = h.toLowerCase();
      if (lower.includes("category") || lower.includes("account") || lower.includes("name") || lower.includes("description")) {
        if (isStatementType && !mapping.category) mapping.category = h;
        if (!isStatementType && !mapping.name) mapping.name = h;
      }
      if (lower.includes("amount") || lower.includes("balance") || lower.includes("total")) {
        if (isStatementType && !mapping.amount) mapping.amount = h;
        if (!isStatementType && !mapping.amountDue) mapping.amountDue = h;
      }
      if (lower.includes("invoice") || lower.includes("number") || lower.includes("bill")) {
        mapping.invoiceNumber = h;
      }
      if (lower.includes("due") && lower.includes("date")) {
        mapping.dueDate = h;
      }
    }
    setColumnMapping(mapping);
    setStep("map");
  };

  const handleProceedToReview = () => {
    if (isStatementType) {
      // Extract unique categories and prepare for mapping
      const categoryCol = columnMapping.category;
      if (!categoryCol) {
        toast.error("Please select a category column");
        return;
      }

      const uniqueCategories = [...new Set(rows.map((r) => r[categoryCol]).filter(Boolean))];
      const mappings: CategoryMapping[] = uniqueCategories.map((cat) => {
        // Try to auto-match by exact name
        const matched = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
        return { originalCategory: cat, mappedCategoryId: matched?.id || null };
      });
      setCategoryMappings(mappings);
    }
    setStep("review");
  };

  const getCategoryTypeForImport = (): CategoryType => {
    if (importType === "pl") return "expense"; // default for P&L
    if (importType === "balance_sheet") return "asset"; // default for BS
    return "expense";
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await createCategory({ name: newCategoryName.trim(), category_type: getCategoryTypeForImport() });
      setNewCategoryName("");
      toast.success("Category created");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    let batchId: string | null = null;

    try {
      // Create import batch
      const batch = await createImport({
        import_type: importType,
        period_start: periodStart,
        period_end: periodEnd,
        source_filename: file?.name,
      });
      batchId = batch.id;

      if (isStatementType) {
        const categoryCol = columnMapping.category!;
        const amountCol = columnMapping.amount!;

        const lines = rows
          .filter((r) => r[categoryCol] && r[amountCol])
          .map((r) => {
            const originalCategory = r[categoryCol];
            const mapping = categoryMappings.find((m) => m.originalCategory === originalCategory);
            const amount = parseFloat(r[amountCol].replace(/[^0-9.-]/g, "")) || 0;
            return {
              original_category: originalCategory,
              amount,
              mapped_category_id: mapping?.mappedCategoryId || undefined,
            };
          });

        await insertLines({
          batchId,
          statementType: importType as "pl" | "balance_sheet",
          periodStart,
          periodEnd,
          lines,
        });

        await completeImport({ batchId, rowCount: lines.length });
      } else if (importType === "open_ar") {
        const nameCol = columnMapping.name!;
        const amountCol = columnMapping.amountDue!;
        const invoiceCol = columnMapping.invoiceNumber;
        const dueDateCol = columnMapping.dueDate;

        const items = rows
          .filter((r) => r[nameCol] && r[amountCol])
          .map((r) => ({
            customer_name: r[nameCol],
            invoice_number: invoiceCol ? r[invoiceCol] : undefined,
            due_date: dueDateCol && r[dueDateCol] ? r[dueDateCol] : undefined,
            amount_due: parseFloat(r[amountCol].replace(/[^0-9.-]/g, "")) || 0,
          }));

        await insertArItems({ batchId, items });
        await completeImport({ batchId, rowCount: items.length });
      } else if (importType === "open_ap") {
        const nameCol = columnMapping.name!;
        const amountCol = columnMapping.amountDue!;
        const billCol = columnMapping.invoiceNumber;
        const dueDateCol = columnMapping.dueDate;

        const items = rows
          .filter((r) => r[nameCol] && r[amountCol])
          .map((r) => ({
            vendor_name: r[nameCol],
            bill_number: billCol ? r[billCol] : undefined,
            due_date: dueDateCol && r[dueDateCol] ? r[dueDateCol] : undefined,
            amount_due: parseFloat(r[amountCol].replace(/[^0-9.-]/g, "")) || 0,
          }));

        await insertApItems({ batchId, items });
        await completeImport({ batchId, rowCount: items.length });
      }

      toast.success("Import completed successfully");
      handleClose();
    } catch (error: any) {
      if (batchId) {
        await failImport({ batchId, errorMessage: error.message });
      }
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceedToReview = isStatementType
    ? columnMapping.category && columnMapping.amount
    : columnMapping.name && columnMapping.amountDue;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import {importTypeLabels[importType]}</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import financial data."}
            {step === "map" && "Map CSV columns to required fields."}
            {step === "review" && "Review and confirm category mappings."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Period</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop a CSV file, or click to browse
                </p>
                <Input type="file" accept=".csv" onChange={handleFileChange} className="max-w-xs mx-auto" />
              </div>
            </div>
          )}

          {step === "map" && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Detected {headers.length} columns and {rows.length} data rows.
                  </AlertDescription>
                </Alert>

                {isStatementType ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category/Account Column *</Label>
                        <Select value={columnMapping.category} onValueChange={(v) => setColumnMapping((m) => ({ ...m, category: v }))}>
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
                        <Label>Amount Column *</Label>
                        <Select value={columnMapping.amount} onValueChange={(v) => setColumnMapping((m) => ({ ...m, amount: v }))}>
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
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{importType === "open_ar" ? "Customer" : "Vendor"} Name Column *</Label>
                        <Select value={columnMapping.name} onValueChange={(v) => setColumnMapping((m) => ({ ...m, name: v }))}>
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
                        <Label>Amount Due Column *</Label>
                        <Select value={columnMapping.amountDue} onValueChange={(v) => setColumnMapping((m) => ({ ...m, amountDue: v }))}>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{importType === "open_ar" ? "Invoice" : "Bill"} Number Column</Label>
                        <Select value={columnMapping.invoiceNumber || ""} onValueChange={(v) => setColumnMapping((m) => ({ ...m, invoiceNumber: v || undefined }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="(Optional)" />
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
                        <Label>Due Date Column</Label>
                        <Select value={columnMapping.dueDate || ""} onValueChange={(v) => setColumnMapping((m) => ({ ...m, dueDate: v || undefined }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="(Optional)" />
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
                  </>
                )}

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview (first 5 rows)</Label>
                  <div className="border rounded overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((h) => (
                            <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            {headers.map((h) => (
                              <TableCell key={h} className="whitespace-nowrap">{row[h]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {step === "review" && isStatementType && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Map each imported category to a financial category. Unmapped categories will be imported but won't appear in reports.
                  </AlertDescription>
                </Alert>

                {/* Quick add category */}
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Category</TableHead>
                      <TableHead>Map To</TableHead>
                      <TableHead className="w-12">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryMappings.map((mapping, idx) => (
                      <TableRow key={mapping.originalCategory}>
                        <TableCell className="font-medium">{mapping.originalCategory}</TableCell>
                        <TableCell>
                          <Select
                            value={mapping.mappedCategoryId || ""}
                            onValueChange={(v) => {
                              const updated = [...categoryMappings];
                              updated[idx].mappedCategoryId = v || null;
                              setCategoryMappings(updated);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unmapped</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name} ({cat.category_type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mapping.mappedCategoryId ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}

          {step === "review" && !isStatementType && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Ready to import {rows.length} {importType === "open_ar" ? "AR" : "AP"} items.
                  </AlertDescription>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{importType === "open_ar" ? "Customer" : "Vendor"}</TableHead>
                      <TableHead>{importType === "open_ar" ? "Invoice" : "Bill"} #</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{columnMapping.name ? row[columnMapping.name] : "—"}</TableCell>
                        <TableCell>{columnMapping.invoiceNumber ? row[columnMapping.invoiceNumber] : "—"}</TableCell>
                        <TableCell>{columnMapping.dueDate ? row[columnMapping.dueDate] : "—"}</TableCell>
                        <TableCell className="text-right">
                          {columnMapping.amountDue ? row[columnMapping.amountDue] : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          ...and {rows.length - 10} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {step !== "upload" && (
            <Button variant="outline" onClick={() => setStep(step === "review" ? "map" : "upload")}>
              Back
            </Button>
          )}
          {step === "map" && (
            <Button onClick={handleProceedToReview} disabled={!canProceedToReview}>
              Continue
            </Button>
          )}
          {step === "review" && (
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? "Importing..." : "Import Data"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
