import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialImports, ImportType } from "@/hooks/useFinancialInsights";
import { format, parseISO } from "date-fns";
import { Upload, FileText, FileSpreadsheet, Receipt, CreditCard } from "lucide-react";
import { useState } from "react";
import { InsightsImportDialog } from "./InsightsImportDialog";

const importTypeConfig: Record<ImportType, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  pl: { label: "P&L Statement", icon: FileText, description: "Profit & Loss / Income Statement" },
  balance_sheet: { label: "Balance Sheet", icon: FileSpreadsheet, description: "Assets, Liabilities, Equity" },
  open_ar: { label: "Open AR", icon: Receipt, description: "Accounts Receivable aging" },
  open_ap: { label: "Open AP", icon: CreditCard, description: "Accounts Payable aging" },
};

export default function InsightsImportsPage() {
  const { imports, isLoading } = useFinancialImports();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState<ImportType>("pl");

  const handleStartImport = (type: ImportType) => {
    setSelectedImportType(type);
    setImportDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Data Imports" description="Import financial data from CSV files" />

      {/* Import Options */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(importTypeConfig) as ImportType[]).map((type) => {
          const config = importTypeConfig[type];
          const Icon = config.icon;
          return (
            <Card key={type} className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleStartImport(type)}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{config.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Previously imported financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pl">P&L</TabsTrigger>
              <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
              <TabsTrigger value="open_ar">AR</TabsTrigger>
              <TabsTrigger value="open_ap">AP</TabsTrigger>
            </TabsList>

            {["all", "pl", "balance_sheet", "open_ar", "open_ap"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports
                      .filter((imp) => tab === "all" || imp.import_type === tab)
                      .map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell>
                            <Badge variant="outline">{importTypeConfig[imp.import_type as ImportType]?.label || imp.import_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(imp.period_start), "MMM d")} - {format(parseISO(imp.period_end), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{imp.source_filename || "—"}</TableCell>
                          <TableCell>{imp.row_count ?? "—"}</TableCell>
                          <TableCell>{getStatusBadge(imp.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(parseISO(imp.created_at), "MMM d, yyyy h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    {imports.filter((imp) => tab === "all" || imp.import_type === tab).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No imports yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <InsightsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importType={selectedImportType}
      />
    </div>
  );
}
