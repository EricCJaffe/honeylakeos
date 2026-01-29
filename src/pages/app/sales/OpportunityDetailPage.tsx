import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  User,
  Building2,
  Clock,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { OpportunityCreateActionsMenu } from "@/components/sales/OpportunityCreateActionsMenu";
import { useSalesOpportunity, useOpportunityStageHistory } from "@/hooks/useSalesOpportunities";
import { useSalesQuotes, useCreateSalesQuote } from "@/hooks/useSalesQuotes";
import { usePipelineStages } from "@/hooks/useSalesPipelines";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { format } from "date-fns";

function OpportunityDetailContent() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: opportunity, isLoading } = useSalesOpportunity(opportunityId);
  const { data: stages = [] } = usePipelineStages(opportunity?.pipeline_id);
  const { data: stageHistory = [] } = useOpportunityStageHistory(opportunityId);
  const { data: quotes = [] } = useSalesQuotes({ opportunityId });
  const createQuote = useCreateSalesQuote();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Opportunity not found</p>
        <Button onClick={() => navigate("/app/sales")}>Back to Sales</Button>
      </div>
    );
  }

  const clientName =
    opportunity.crm_client?.person_full_name ||
    opportunity.crm_client?.org_name ||
    null;

  const getStatusBadge = () => {
    switch (opportunity.status) {
      case "won":
        return <Badge className="bg-green-500">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="secondary">Open</Badge>;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/sales")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={opportunity.name}
            description={opportunity.stage?.name || "Unknown Stage"}
          />
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <OpportunityCreateActionsMenu
            opportunityId={opportunity.id}
            opportunityName={opportunity.name}
          />
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-semibold">
                      {opportunity.value_amount != null
                        ? `$${opportunity.value_amount.toLocaleString()}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Close</p>
                    <p className="font-semibold">
                      {opportunity.expected_close_date
                        ? format(new Date(opportunity.expected_close_date), "MMM d, yyyy")
                        : "Not set"}
                    </p>
                  </div>
                </div>

                {clientName && (
                  <div className="flex items-center gap-3">
                    {opportunity.crm_client?.type === "organization" ? (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-semibold">{clientName}</p>
                    </div>
                  </div>
                )}

                {opportunity.closed_at && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="font-semibold">
                        {format(new Date(opportunity.closed_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {opportunity.lost_reason && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Lost Reason</p>
                    <p className="font-medium text-red-600">{opportunity.lost_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="history">Stage History</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <EntityLinksPanel
                    entityType="sales_opportunity"
                    entityId={opportunity.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Quotes</span>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!opportunity.crm_client_id) return;
                        const created = await createQuote.mutateAsync({
                          crm_client_id: opportunity.crm_client_id,
                          opportunity_id: opportunity.id,
                          title: `Quote — ${opportunity.name}`,
                          quote_type: "sow",
                        });
                        navigate(`/app/sales/quotes/${created.id}`);
                      }}
                    >
                      Create Quote
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quotes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No quotes yet for this opportunity.</p>
                  ) : (
                    <div className="space-y-2">
                      {quotes.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between rounded border p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/app/sales/quotes/${q.id}`)}
                        >
                          <div>
                            <div className="font-medium">{q.title}</div>
                            <div className="text-xs text-muted-foreground">{q.quote_type.toUpperCase()}</div>
                          </div>
                          <Badge variant={q.status === "won" ? "default" : q.status === "lost" ? "destructive" : "secondary"}>{q.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Stage Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stageHistory.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No stage changes recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {stageHistory.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between border-b pb-3 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            {h.from_stage && (
                              <>
                                <Badge variant="outline">{h.from_stage.name}</Badge>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <Badge>{h.to_stage?.name || "Unknown"}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(h.changed_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Pipeline Stages Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stages.map((stage, index) => {
                  const isActive = stage.id === opportunity.stage_id;
                  const isPast = stages.findIndex((s) => s.id === opportunity.stage_id) > index;

                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isPast
                          ? "bg-muted text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-primary-foreground text-primary"
                            : isPast
                            ? "bg-muted-foreground/20"
                            : "border border-current"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium">{stage.name}</span>
                      {stage.probability_percent != null && (
                        <span className="ml-auto text-xs opacity-70">
                          {stage.probability_percent}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <OpportunityFormDialog
        open={showEditForm}
        onOpenChange={setShowEditForm}
        opportunity={opportunity}
      />
    </div>
  );
}

export default function OpportunityDetailPage() {
  return (
    <ModuleGuard moduleKey="sales" moduleName="Sales">
      <OpportunityDetailContent />
    </ModuleGuard>
  );
}
