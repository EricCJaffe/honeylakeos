import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Megaphone, Calendar, MoreHorizontal, Pencil, Archive } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useSalesCampaigns, useArchiveCampaign, CAMPAIGN_TYPE_LABELS, SalesCampaign } from "@/hooks/useSalesCampaigns";
import { CampaignFormDialog } from "./CampaignFormDialog";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function CampaignsContent() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SalesCampaign | null>(null);

  const { data: campaigns = [], isLoading } = useSalesCampaigns();
  const archiveCampaign = useArchiveCampaign();

  const handleEdit = (campaign: SalesCampaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCampaign(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Campaigns"
          description="Track marketing campaigns for attribution"
        />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Campaigns"
          description="Create campaigns to track where your opportunities come from."
          actionLabel="Create Campaign"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {CAMPAIGN_TYPE_LABELS[campaign.type]}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => archiveCampaign.mutate(campaign.id)}
                      className="text-destructive"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
                {(campaign.start_date || campaign.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {campaign.start_date && format(new Date(campaign.start_date), "MMM d")}
                    {campaign.start_date && campaign.end_date && " - "}
                    {campaign.end_date && format(new Date(campaign.end_date), "MMM d, yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <CampaignFormDialog
        open={showForm}
        onOpenChange={handleCloseForm}
        campaign={editingCampaign}
      />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <ModuleGuard moduleKey="sales" moduleName="Sales">
      <CampaignsContent />
    </ModuleGuard>
  );
}
