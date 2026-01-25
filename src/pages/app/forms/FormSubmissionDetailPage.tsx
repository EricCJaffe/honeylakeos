import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useWfFormSubmission } from "@/hooks/useWorkflowForms";
import { format } from "date-fns";

// Section configuration for different form templates
const FORM_SECTIONS: Record<string, { sections: { key: string; title: string; fieldPatterns: string[] }[] }> = {
  // Annual Goals Portfolio
  "generic_annual_goals_portfolio": {
    sections: [
      { key: "header", title: "General Information", fieldPatterns: ["year", "participant_name"] },
      { key: "life_stewardship", title: "Life Stewardship Goals", fieldPatterns: ["abiding", "bible_study", "making_disciples", "fellowship", "sabbath", "marriage", "family", "our_body", "money", "time", "gifts_talents"] },
      { key: "business_strategic", title: "Business Strategic Initiatives", fieldPatterns: ["financial", "customers", "operations", "capacity", "redemption"] },
      { key: "primary_initiative", title: "Annual Primary Initiative", fieldPatterns: ["annual_primary", "primary_initiative"] },
    ],
  },
  // Key Leader Member Covenant
  "generic_key_leader_member_covenant": {
    sections: [
      { key: "member_info", title: "Member Information", fieldPatterns: ["member_name", "title", "company_name", "home_address", "spouse_name", "anniversary_date", "birthdate", "place_of_worship", "children", "cell_phone", "email", "business_address", "website", "industry", "annual_gross_revenue", "number_of_employees"] },
      { key: "fees", title: "Fees", fieldPatterns: ["registration_fee", "monthly_dues"] },
      { key: "covenant", title: "Covenant Commitments", fieldPatterns: ["attendance_commitment", "confidentiality_commitment", "no_soliciting", "doctrine_agreement"] },
      { key: "signature", title: "Signature", fieldPatterns: ["signature", "signature_date"] },
    ],
  },
};

function getSectionForField(fieldKey: string, templateKey: string | undefined): string {
  const key = fieldKey.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const config = templateKey ? FORM_SECTIONS[templateKey] : undefined;
  
  if (config) {
    for (const section of config.sections) {
      if (section.fieldPatterns.some(pattern => key.includes(pattern))) {
        return section.key;
      }
    }
  }
  
  return "other";
}

function getSectionTitle(sectionKey: string, templateKey: string | undefined): string {
  const config = templateKey ? FORM_SECTIONS[templateKey] : undefined;
  if (config) {
    const section = config.sections.find(s => s.key === sectionKey);
    if (section) return section.title;
  }
  
  // Fallback titles
  const fallbacks: Record<string, string> = {
    header: "General Information",
    member_info: "Member Information",
    fees: "Fees",
    covenant: "Covenant Commitments",
    signature: "Signature",
    life_stewardship: "Life Stewardship Goals",
    business_strategic: "Business Strategic Initiatives",
    primary_initiative: "Annual Primary Initiative",
    other: "Additional Information",
  };
  return fallbacks[sectionKey] ?? "Information";
}

export default function FormSubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const { data: submission, isLoading } = useWfFormSubmission(submissionId);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This submission may have been deleted or you don't have access.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const form = submission.form as any;
  const templateKey = form?.template_key as string | undefined;
  const values = (submission.values as any[]) ?? [];

  // Build section keys from config or derive from field keys
  const configSectionKeys = templateKey && FORM_SECTIONS[templateKey] 
    ? FORM_SECTIONS[templateKey].sections.map(s => s.key)
    : [];
  
  const allSectionKeys = new Set<string>([...configSectionKeys, "other"]);

  // Group values by section
  const groupedValues: Record<string, typeof values> = {};
  allSectionKeys.forEach(key => { groupedValues[key] = []; });

  values.forEach((v) => {
    const field = v.field;
    if (!field) return;
    const section = getSectionForField(field.key, templateKey);
    if (!groupedValues[section]) {
      groupedValues[section] = [];
      allSectionKeys.add(section);
    }
    groupedValues[section].push(v);
  });

  // Sort by sort_order within each section
  Object.keys(groupedValues).forEach((section) => {
    groupedValues[section].sort((a, b) => (a.field?.sort_order ?? 0) - (b.field?.sort_order ?? 0));
  });

  const renderValue = (v: any) => {
    const fieldType = v.field?.field_type;
    const value = v.value_text ?? v.value_number ?? v.value_json ?? v.value_date;
    
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not provided</span>;
    }
    
    // Handle checkbox fields
    if (fieldType === "checkbox") {
      const isChecked = value === "yes" || value === true || value === "true";
      return (
        <div className="flex items-center gap-2">
          {isChecked ? (
            <Check className="h-5 w-5 text-primary" />
          ) : (
            <X className="h-5 w-5 text-destructive" />
          )}
          <span>{isChecked ? "Agreed" : "Not agreed"}</span>
        </div>
      );
    }
    
    // Handle yes/no fields
    if (fieldType === "yes_no") {
      const isYes = value === "yes" || value === true;
      return isYes ? "Yes" : "No";
    }
    
    // Handle date fields
    if (fieldType === "date" && value) {
      try {
        return format(new Date(value), "MMM d, yyyy");
      } catch {
        return String(value);
      }
    }
    
    // Handle object values
    if (typeof value === "object") {
      if (value.items) return value.items.join(", ");
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const renderSection = (sectionKey: string) => {
    const sectionValues = groupedValues[sectionKey];
    if (!sectionValues || sectionValues.length === 0) return null;

    const title = getSectionTitle(sectionKey, templateKey);
    const isCovenantSection = sectionKey === "covenant";

    return (
      <Card key={sectionKey}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sectionValues.map((v) => (
            <div key={v.id} className={isCovenantSection ? "flex items-start gap-3 p-3 bg-muted rounded-lg" : "space-y-1"}>
              {isCovenantSection ? (
                <>
                  <div className="flex-shrink-0 mt-0.5">
                    {renderValue(v)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {v.field?.help_text || v.field?.label}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    {v.field?.label}
                  </p>
                  <p className="whitespace-pre-wrap">{renderValue(v)}</p>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Get ordered section keys (configured sections first, then "other")
  const orderedSectionKeys = [...configSectionKeys];
  if (groupedValues["other"]?.length > 0) {
    orderedSectionKeys.push("other");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader 
            title={form?.title ?? "Form Submission"} 
            description="View submission details" 
          />
        </div>
        <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
          {submission.status}
        </Badge>
      </div>

      {/* Metadata Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Submission Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Submitted:</span>
              <span>{format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Form:</span>
              <span>{form?.title}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render all sections in order */}
      {orderedSectionKeys.map(sectionKey => renderSection(sectionKey))}
    </div>
  );
}