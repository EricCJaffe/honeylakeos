import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface InspectorOrgDetailProps {
  orgId: string;
  onBack: () => void;
}

interface OrgData {
  id: string;
  company_id: string;
  program_name: string;
  program_version: string | null;
  created_at: string;
  _companyName: string;
}

interface ManagerData {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  _fullName: string;
  _email: string;
}

interface CoachData {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  _fullName: string;
  _email: string;
}

interface EngagementData {
  id: string;
  member_company_id: string;
  status: string;
  created_at: string;
  _memberCompanyName: string;
}

export function InspectorOrgDetail({ orgId, onBack }: InspectorOrgDetailProps) {
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["inspector-org-detail", orgId],
    queryFn: async (): Promise<OrgData | null> => {
      const { data, error } = await supabase
        .from("coaching_orgs")
        .select("id, company_id, program_name, program_version, created_at")
        .eq("id", orgId)
        .single();

      if (error) throw error;

      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", data.company_id)
        .maybeSingle();

      return {
        ...data,
        _companyName: company?.name || "Unknown"
      };
    }
  });

  const { data: managers } = useQuery({
    queryKey: ["inspector-org-managers", orgId],
    queryFn: async (): Promise<ManagerData[]> => {
      const { data, error } = await supabase
        .from("coaching_managers")
        .select("id, user_id, status, created_at")
        .eq("coaching_org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const managersWithProfiles = await Promise.all(
        (data || []).map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", m.user_id)
            .maybeSingle();

          return {
            ...m,
            _fullName: profile?.full_name || "Unknown",
            _email: profile?.email || "-"
          };
        })
      );

      return managersWithProfiles;
    },
    enabled: !!orgId
  });

  const { data: coaches } = useQuery({
    queryKey: ["inspector-org-coaches", orgId],
    queryFn: async (): Promise<CoachData[]> => {
      const { data, error } = await supabase
        .from("coaching_coaches")
        .select("id, user_id, status, created_at")
        .eq("coaching_org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const coachesWithProfiles = await Promise.all(
        (data || []).map(async (c) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", c.user_id)
            .maybeSingle();

          return {
            ...c,
            _fullName: profile?.full_name || "Unknown",
            _email: profile?.email || "-"
          };
        })
      );

      return coachesWithProfiles;
    },
    enabled: !!orgId
  });

  const { data: engagements } = useQuery({
    queryKey: ["inspector-org-engagements", orgId],
    queryFn: async (): Promise<EngagementData[]> => {
      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select("id, member_company_id, status, created_at")
        .eq("coaching_org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const engagementsWithCompanies = await Promise.all(
        (data || []).map(async (e) => {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", e.member_company_id)
            .maybeSingle();

          return {
            ...e,
            _memberCompanyName: company?.name || "Unknown"
          };
        })
      );

      return engagementsWithCompanies;
    },
    enabled: !!orgId
  });

  const { data: workflowTemplates } = useQuery({
    queryKey: ["inspector-org-workflow-templates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_workflow_templates")
        .select("*")
        .eq("coaching_org_id", orgId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!orgId
  });

  const { data: terms } = useQuery({
    queryKey: ["inspector-org-terms", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_terms")
        .select("*")
        .eq("coaching_org_id", orgId)
        .order("term_key");

      if (error) throw error;
      return data;
    },
    enabled: !!orgId
  });

  if (orgLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "suspended":
        return "secondary";
      case "ended":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{org?._companyName || "Unknown Org"}</h2>
          <p className="text-sm text-muted-foreground">
            {org?.program_name || "No Program"} 
            {org?.program_version && ` v${org.program_version}`}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/app/coaching/dashboard`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Coaching Dashboard
          </a>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="managers">Managers ({managers?.length || 0})</TabsTrigger>
          <TabsTrigger value="coaches">Coaches ({coaches?.length || 0})</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({engagements?.length || 0})</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Templates ({workflowTemplates?.length || 0})</TabsTrigger>
          <TabsTrigger value="terminology">Terminology ({terms?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Org ID</dt>
                  <dd className="font-mono text-sm">{org?.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Company ID</dt>
                  <dd className="font-mono text-sm">{org?.company_id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd>{org?.created_at && format(new Date(org.created_at), "PPP")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Program</dt>
                  <dd>{org?.program_name || "None"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m._fullName}</TableCell>
                      <TableCell>{m._email}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "active" ? "default" : "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(m.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!managers?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No managers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaches">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coaches?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c._fullName}</TableCell>
                      <TableCell>{c._email}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!coaches?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No coaches
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagements">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagements?.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e._memberCompanyName}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(e.status)}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(e.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!engagements?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No engagements
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowTemplates?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>{w.name}</TableCell>
                      <TableCell className="text-muted-foreground">{w.description || "-"}</TableCell>
                      <TableCell>{format(new Date(w.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!workflowTemplates?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No workflow templates
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminology">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">{t.term_key}</TableCell>
                      <TableCell>{t.term_value}</TableCell>
                    </TableRow>
                  ))}
                  {!terms?.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No custom terminology
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
