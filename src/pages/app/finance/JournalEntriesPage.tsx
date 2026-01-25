import * as React from "react";
import { Search, BookOpen, MoreHorizontal, Eye, Plus, CheckCircle, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJournalEntries, JournalEntryStatus } from "@/hooks/useJournalEntries";

function getStatusBadgeVariant(status: JournalEntryStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "posted":
      return "default";
    case "draft":
      return "outline";
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

export default function JournalEntriesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<JournalEntryStatus | "all">("all");

  const { data: entries = [], isLoading } = useJournalEntries({
    status: statusFilter === "all" ? null : statusFilter,
    search: search || null,
  });

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Journal Entries"
        description="Create and manage double-entry accounting transactions"
        actionLabel="New Entry"
        onAction={() => navigate("/app/finance/journal/new")}
      />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by entry # or memo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JournalEntryStatus | "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No journal entries yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first journal entry to start recording transactions
            </p>
            <Button onClick={() => navigate("/app/finance/journal/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <div className="hidden md:grid grid-cols-6 gap-4 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div>Entry #</div>
            <div>Date</div>
            <div className="col-span-2">Memo</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="font-medium truncate font-mono text-sm">
                  {entry.entry_number}
                </div>
                <div className="text-sm">
                  {format(new Date(entry.entry_date), "MMM d, yyyy")}
                </div>
                <div className="hidden md:block col-span-2 text-sm text-muted-foreground truncate">
                  {entry.memo || "—"}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(entry.total_debit)}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Badge variant={getStatusBadgeVariant(entry.status)}>
                    {entry.status}
                  </Badge>
                  {!entry.is_balanced && entry.status === "draft" && (
                    <Badge variant="destructive" className="text-xs">
                      Unbalanced
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/app/finance/journal/${entry.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
