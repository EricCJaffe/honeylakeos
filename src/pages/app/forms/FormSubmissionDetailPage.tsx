import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { useWfFormSubmission } from "@/hooks/useWorkflowForms";
import { format } from "date-fns";

// Field sections for the Annual Goals Portfolio form
const LIFE_STEWARDSHIP_FIELDS = [
  "abiding", "bible_study", "making_disciples", "fellowship", "sabbath",
  "marriage", "family", "our_body", "money", "time", "gifts_talents"
];

const BUSINESS_STRATEGIC_FIELDS = [
  "financial", "customers", "operations", "capacity", "redemption"
];

function getSectionForField(fieldKey: string): string {
  const key = fieldKey.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (key === "year" || key === "participant_name") return "header";
  if (LIFE_STEWARDSHIP_FIELDS.some(f => key.includes(f))) return "life_stewardship";
  if (BUSINESS_STRATEGIC_FIELDS.some(f => key.includes(f))) return "business_strategic";
  if (key.includes("annual_primary") || key.includes("primary_initiative")) return "primary_initiative";
  return "other";
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
  const values = (submission.values as any[]) ?? [];

  // Group values by section
  const groupedValues: Record<string, typeof values> = {
    header: [],
    life_stewardship: [],
    business_strategic: [],
    primary_initiative: [],
    other: [],
  };

  values.forEach((v) => {
    const field = v.field;
    if (!field) return;
    const section = getSectionForField(field.key);
    groupedValues[section].push(v);
  });

  // Sort by sort_order within each section
  Object.keys(groupedValues).forEach((section) => {
    groupedValues[section].sort((a, b) => (a.field?.sort_order ?? 0) - (b.field?.sort_order ?? 0));
  });

  const renderValue = (v: any) => {
    const value = v.value_text ?? v.value_number ?? v.value_json ?? v.value_date;
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not provided</span>;
    }
    if (typeof value === "object") {
      if (value.items) return value.items.join(", ");
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderSection = (sectionKey: string, title: string) => {
    const sectionValues = groupedValues[sectionKey];
    if (sectionValues.length === 0) return null;

    return (
      <Card key={sectionKey}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sectionValues.map((v) => (
            <div key={v.id} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {v.field?.label}
              </p>
              <p className="whitespace-pre-wrap">{renderValue(v)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

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

      {/* Header Fields */}
      {renderSection("header", "General Information")}

      {/* Life Stewardship Section */}
      {renderSection("life_stewardship", "Life Stewardship Goals")}

      {/* Business Strategic Section */}
      {renderSection("business_strategic", "Business Strategic Initiatives")}

      {/* Primary Initiative */}
      {renderSection("primary_initiative", "Annual Primary Initiative")}

      {/* Other Fields */}
      {renderSection("other", "Additional Information")}
    </div>
  );
}