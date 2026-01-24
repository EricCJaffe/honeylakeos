import * as React from "react";
import { useState } from "react";
import { Heart, Plus, Search, Filter, Users, TrendingUp, DollarSign } from "lucide-react";
import { useDonorProfiles, useDonations, useDonorCampaigns, DonorProfile } from "@/hooks/useDonors";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DonorFormDialog } from "./DonorFormDialog";
import { DonationFormDialog } from "./DonationFormDialog";
import { CampaignFormDialog } from "./CampaignFormDialog";

const statusColors: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-600",
  lapsed: "bg-yellow-500/10 text-yellow-600",
  major: "bg-purple-500/10 text-purple-600",
};

export default function DonorsPage() {
  const { data: donors = [], isLoading: donorsLoading } = useDonorProfiles();
  const { data: donations = [], isLoading: donationsLoading } = useDonations();
  const { data: campaigns = [], isLoading: campaignsLoading } = useDonorCampaigns();
  const { getSingular, getPlural } = useCompanyTerminology();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("donors");
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  const donorLabel = getSingular("donor") || "Donor";
  const donorsLabel = getPlural("donor") || "Donors";

  // Summary metrics
  const totalDonors = donors.length;
  const activeDonors = donors.filter(d => d.donor_status === "active").length;
  const totalGiving = donors.reduce((sum, d) => sum + d.lifetime_giving_amount, 0);
  const recentDonations = donations.slice(0, 5);

  // Filter donors
  const filteredDonors = donors.filter(donor => {
    const name = donor.crm_client?.person_full_name || donor.crm_client?.org_name || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || donor.donor_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDonorName = (donor: DonorProfile) => {
    return donor.crm_client?.person_full_name || donor.crm_client?.org_name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={donorsLabel}
        description={`Manage ${donorsLabel.toLowerCase()}, donations, and campaigns`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCampaignDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Campaign
          </Button>
          <Button variant="outline" onClick={() => setDonationDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Donation
          </Button>
          <Button onClick={() => setDonorDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {donorLabel}
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {donorsLabel}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active {donorsLabel}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDonors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Giving</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGiving)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="donors">{donorsLabel}</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="donors" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${donorsLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="major">Major</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {donorsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDonors.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={`No ${donorsLabel.toLowerCase()} found`}
              description={searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : `Add your first ${donorLabel.toLowerCase()} to get started`}
              actionLabel={!searchQuery && statusFilter === "all" ? `Add ${donorLabel}` : undefined}
              onAction={!searchQuery && statusFilter === "all" ? () => setDonorDialogOpen(true) : undefined}
            />
          ) : (
            <div className="grid gap-3">
              {filteredDonors.map((donor) => (
                <Card key={donor.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Heart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{getDonorName(donor)}</p>
                          <p className="text-sm text-muted-foreground">
                            {donor.crm_client?.type === "person" ? "Individual" : "Organization"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(donor.lifetime_giving_amount)}</p>
                          <p className="text-xs text-muted-foreground">Lifetime giving</p>
                        </div>
                        <Badge className={cn("capitalize", statusColors[donor.donor_status])}>
                          {donor.donor_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          {donationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : donations.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No donations yet"
              description="Record your first donation to start tracking giving"
              actionLabel="Record Donation"
              onAction={() => setDonationDialogOpen(true)}
            />
          ) : (
            <div className="grid gap-3">
              {donations.map((donation) => (
                <Card key={donation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {donation.donor_profile?.crm_client?.person_full_name || 
                           donation.donor_profile?.crm_client?.org_name || 
                           "Anonymous"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(donation.donation_date), "MMM d, yyyy")}
                          {donation.campaign && ` • ${donation.campaign.name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(donation.amount)}</p>
                        <Badge variant="outline" className="capitalize">
                          {donation.payment_method.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No campaigns yet"
              description="Create your first campaign to organize giving"
              actionLabel="Create Campaign"
              onAction={() => setCampaignDialogOpen(true)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const campaignDonations = donations.filter(d => d.campaign_id === campaign.id);
                const raised = campaignDonations.reduce((sum, d) => sum + d.amount, 0);
                const progress = campaign.goal_amount ? (raised / campaign.goal_amount) * 100 : 0;

                return (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Raised: {formatCurrency(raised)}</span>
                          {campaign.goal_amount && (
                            <span className="text-muted-foreground">
                              Goal: {formatCurrency(campaign.goal_amount)}
                            </span>
                          )}
                        </div>
                        {campaign.goal_amount && (
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {campaignDonations.length} donation{campaignDonations.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DonorFormDialog open={donorDialogOpen} onOpenChange={setDonorDialogOpen} />
      <DonationFormDialog open={donationDialogOpen} onOpenChange={setDonationDialogOpen} donors={donors} campaigns={campaigns} />
      <CampaignFormDialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen} />
    </div>
  );
}
