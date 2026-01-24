import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useFrameworks, useCompanyActiveFramework } from "@/hooks/useFrameworks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Search,
  Calendar,
  Target,
  FileText,
  ArrowRight,
  Plus,
  Layers,
} from "lucide-react";

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  linkedCadence?: string;
  linkedConcept?: string;
  updatedAt: string;
}

export default function PlaybooksPage() {
  const { activeCompanyId } = useActiveCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: activeFramework } = useCompanyActiveFramework();

  // Fetch playbook documents (notes tagged as playbooks or in a playbooks folder)
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ["coach-playbooks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // For MVP, we'll fetch notes that could serve as playbooks
      // In production, you'd have a dedicated tag or folder system
      const { data: notes, error } = await supabase
        .from("notes")
        .select("id, title, content, updated_at")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter to notes that look like playbooks (contain "playbook", "guide", "checklist" in title)
      const playbookKeywords = ["playbook", "guide", "checklist", "how to", "template"];
      const filtered = (notes || []).filter((note) =>
        playbookKeywords.some((kw) =>
          note.title.toLowerCase().includes(kw)
        )
      );

      return filtered.map((note) => ({
        id: note.id,
        title: note.title,
        description: note.content?.substring(0, 150) || null,
        content: note.content,
        updatedAt: note.updated_at,
      })) as Playbook[];
    },
    enabled: !!activeCompanyId,
  });

  // Get framework cadences for linking context
  const frameworkCadences = activeFramework?.framework
    ? [] // Would fetch from framework details
    : [];

  const filteredPlaybooks = playbooks?.filter((pb) =>
    !searchQuery ||
    pb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sample recommended playbooks structure (would be linked to framework in production)
  const recommendedPlaybooks = [
    {
      title: "How to Run a Strong Weekly Meeting",
      description: "Checklist and facilitation guide for Level 10 meetings",
      cadence: "weekly_level10",
      icon: Calendar,
    },
    {
      title: "Quarterly Planning Prep Guide",
      description: "Steps to prepare clients for quarterly planning sessions",
      cadence: "quarterly_planning",
      icon: Target,
    },
    {
      title: "Rocks Review Coaching Tips",
      description: "How to coach clients through stuck priorities",
      concept: "quarterly_priorities",
      icon: Target,
    },
    {
      title: "Issues Solving Best Practices",
      description: "IDS methodology and coaching interventions",
      concept: "issues",
      icon: FileText,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Framework Playbooks" description="Loading..." />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework Playbooks"
        description="Coaching guides and resources for framework implementation"
      />

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild>
          <Link to="/app/notes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Playbook
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Playbooks</TabsTrigger>
          <TabsTrigger value="cadences">By Cadence</TabsTrigger>
          <TabsTrigger value="concepts">By Concept</TabsTrigger>
        </TabsList>

        {/* All Playbooks */}
        <TabsContent value="all" className="space-y-4">
          {/* Recommended Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recommended for Your Framework
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {recommendedPlaybooks.map((playbook, idx) => {
                const Icon = playbook.icon;
                return (
                  <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{playbook.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {playbook.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        {playbook.cadence && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {playbook.cadence.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {playbook.concept && (
                          <Badge variant="outline" className="text-xs">
                            <Layers className="mr-1 h-3 w-3" />
                            {playbook.concept.replace(/_/g, " ")}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          View
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Company Playbooks */}
          {filteredPlaybooks.length > 0 && (
            <div className="space-y-3 mt-8">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Your Playbooks
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPlaybooks.map((playbook) => (
                  <Card key={playbook.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{playbook.title}</CardTitle>
                      {playbook.description && (
                        <CardDescription className="text-sm line-clamp-2">
                          {playbook.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Updated {new Date(playbook.updatedAt).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/app/notes/${playbook.id}`}>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredPlaybooks.length === 0 && playbooks?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Playbooks Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create coaching guides and checklists to help your team deliver consistent value.
                </p>
                <Button asChild>
                  <Link to="/app/notes/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Playbook
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* By Cadence */}
        <TabsContent value="cadences" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {["weekly_level10", "monthly_check_in", "quarterly_planning", "annual_planning"].map((cadence) => (
              <Card key={cadence}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {cadence.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Playbooks and resources for this cadence
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Playbooks
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* By Concept */}
        <TabsContent value="concepts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {["vision", "quarterly_priorities", "scorecard", "issues", "meetings", "to_dos"].map((concept) => (
              <Card key={concept}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {concept.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="w-full">
                    View Resources
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
