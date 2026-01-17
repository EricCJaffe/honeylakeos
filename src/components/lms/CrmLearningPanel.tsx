import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { isPast } from "date-fns";

interface CrmLearningPanelProps {
  crmClientId: string;
  externalContactId?: string | null;
}

export function CrmLearningPanel({ crmClientId, externalContactId }: CrmLearningPanelProps) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  // Skip if LMS not enabled
  if (!lmsEnabled) return null;

  // For now, show a simple placeholder - full implementation would track
  // learning assigned to CRM contacts via entity_links or external_contact_id
  const { data, isLoading } = useQuery({
    queryKey: ["crm-learning-activity", crmClientId, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { assignments: [] };

      // Check entity_links for any LMS content linked to this CRM record
      const { data: links } = await supabase
        .from("entity_links")
        .select("to_type, to_id")
        .eq("company_id", activeCompanyId)
        .eq("from_type", "crm_client")
        .eq("from_id", crmClientId)
        .in("to_type", ["learning_path", "course", "lesson"]);

      return { linkedItems: links || [] };
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learning Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const linkedItems = data?.linkedItems || [];

  if (linkedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learning Activity
          </CardTitle>
          <CardDescription>No learning content linked to this record</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Learning Activity
        </CardTitle>
        <CardDescription>{linkedItems.length} linked learning items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {linkedItems.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {item.to_type === "learning_path" && <GraduationCap className="h-4 w-4 text-primary" />}
              {item.to_type === "course" && <BookOpen className="h-4 w-4 text-blue-500" />}
              {item.to_type === "lesson" && <FileText className="h-4 w-4 text-emerald-500" />}
              <span className="capitalize">{item.to_type.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
