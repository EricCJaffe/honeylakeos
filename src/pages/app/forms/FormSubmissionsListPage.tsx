import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useWfFormSubmissions } from "@/hooks/useWorkflowForms";
import { useFormByTemplateKey, getFormTemplate } from "@/hooks/useFormByTemplateKey";
import { format } from "date-fns";

export default function FormSubmissionsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateKey = searchParams.get("template") ?? undefined;
  const formIdParam = searchParams.get("formId") ?? undefined;

  const template = templateKey ? getFormTemplate(templateKey) : undefined;
  
  // Get form by template key to get formId for filtering
  const { data: templateForm, isLoading: templateLoading } = useFormByTemplateKey(templateKey);
  
  // Use formId from template lookup or from URL param
  const formId = templateForm?.id ?? formIdParam;
  
  // Get submissions - filter by formId
  const { data: submissions, isLoading: submissionsLoading } = useWfFormSubmissions({ 
    formId: formId 
  });

  const isLoading = templateLoading || submissionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = template?.title ?? templateForm?.title ?? "Form Submissions";
  const description = template?.description ?? "View all submissions";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader title={title} description={description} />
        </div>
        {templateKey && (
          <Button onClick={() => navigate(`/app/forms/${templateKey}`)}>
            <FileText className="mr-2 h-4 w-4" />
            New Submission
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            {submissions?.length ?? 0} total submission{(submissions?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions && submissions.length > 0 ? (
            <div className="space-y-2">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/app/forms/submissions/${submission.id}`)}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {(submission.form as any)?.title ?? "Submission"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  
                  <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
                    {submission.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No submissions yet</p>
              <p className="text-sm mt-1">
                Submissions will appear here once forms are filled out.
              </p>
              {templateKey && (
                <Button 
                  variant="link" 
                  className="mt-4"
                  onClick={() => navigate(`/app/forms/${templateKey}`)}
                >
                  Create your first submission
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}