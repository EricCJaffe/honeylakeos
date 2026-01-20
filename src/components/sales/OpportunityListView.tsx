import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, ExternalLink, Building2, User } from "lucide-react";
import { SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { OpportunityFormDialog } from "@/pages/app/sales/OpportunityFormDialog";

interface OpportunityListViewProps {
  opportunities: SalesOpportunity[];
  pipelineId: string;
  filter?: "all" | "open" | "won" | "lost";
}

function getClientDisplayName(client: SalesOpportunity["crm_client"]): string {
  if (!client) return "—";
  if (client.entity_kind === "organization") {
    return client.org_name || client.person_full_name || "Unnamed";
  }
  return client.person_full_name || client.org_name || "Unnamed";
}

export function OpportunityListView({ opportunities, pipelineId, filter = "all" }: OpportunityListViewProps) {
  const navigate = useNavigate();
  const [editingOpportunity, setEditingOpportunity] = useState<SalesOpportunity | null>(null);

  const filteredOpps = opportunities.filter((opp) => {
    if (filter === "all") return true;
    return opp.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-500">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="secondary">Open</Badge>;
    }
  };

  if (filteredOpps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No opportunities found
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Expected Close</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {filteredOpps.map((opp) => {
              const isOrg = opp.crm_client?.entity_kind === "organization";
              return (
                <TableRow
                  key={opp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/app/sales/opportunities/${opp.id}`)}
                >
                  <TableCell className="font-medium">{opp.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {opp.crm_client && (
                        isOrg ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{getClientDisplayName(opp.crm_client)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{opp.stage?.name || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    {opp.value_amount != null ? `$${opp.value_amount.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    {opp.expected_close_date
                      ? format(new Date(opp.expected_close_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(opp.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingOpportunity(opp);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/sales/opportunities/${opp.id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <OpportunityFormDialog
        open={!!editingOpportunity}
        onOpenChange={(open) => !open && setEditingOpportunity(null)}
        opportunity={editingOpportunity || undefined}
        pipelineId={pipelineId}
      />
    </>
  );
}
