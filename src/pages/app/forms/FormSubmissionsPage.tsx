import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Eye, Trash2, User, Building2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useForm } from "@/hooks/useForms";
import { useFormSubmissions, useDeleteSubmission, FormSubmission } from "@/hooks/useFormSubmissions";
import { format } from "date-fns";

function SubmissionDetailSheet({
  submission,
  open,
  onOpenChange,
}: {
  submission: FormSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!submission) return null;

  const values = submission.values || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Submission Details</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {/* Submitter Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Submitter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {submission.submitter_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.submitter_name}</span>
                </div>
              )}
              {submission.submitter_email && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <a href={`mailto:${submission.submitter_email}`} className="text-primary hover:underline">
                    {submission.submitter_email}
                  </a>
                </div>
              )}
              {submission.submitter_phone && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📞</span>
                  <span>{submission.submitter_phone}</span>
                </div>
              )}
              {!submission.submitter_name && !submission.submitter_email && !submission.submitter_phone && (
                <p className="text-muted-foreground">No submitter info captured</p>
              )}
            </CardContent>
          </Card>

          {/* Linked Records */}
          {(submission.created_external_contact_id || submission.created_crm_client_id || submission.created_task_id) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Created Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submission.created_external_contact_id && (
                  <Link
                    to={`/app/contacts/${submission.created_external_contact_id}`}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm">View External Contact</span>
                  </Link>
                )}
                {submission.created_crm_client_id && (
                  <Link
                    to={`/app/crm/${submission.created_crm_client_id}`}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">View CRM Record</span>
                  </Link>
                )}
                {submission.created_task_id && (
                  <Link
                    to={`/app/tasks/${submission.created_task_id}`}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-sm">View Task</span>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Field Values */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {values.length === 0 ? (
                <p className="text-sm text-muted-foreground">No responses</p>
              ) : (
                <div className="space-y-3">
                  {values.map((v) => (
                    <div key={v.id} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {v.field?.label || "Unknown Field"}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {v.value || <span className="text-muted-foreground italic">No answer</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            Submitted {format(new Date(submission.submitted_at), "PPpp")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FormSubmissionsContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading: formLoading } = useForm(id);
  const { data: submissions = [], isLoading: submissionsLoading } = useFormSubmissions(id);
  const deleteSubmission = useDeleteSubmission();

  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<FormSubmission | null>(null);

  const isLoading = formLoading || submissionsLoading;

  const handleDelete = async () => {
    if (submissionToDelete) {
      await deleteSubmission.mutateAsync(submissionToDelete.id);
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/app/forms")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Form not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/forms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{form.name}</h1>
            <p className="text-sm text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/app/forms/${id}/edit`)}>
          Edit Form
        </Button>
      </div>

      {/* Submissions Table */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No submissions yet"
          description="Submissions will appear here once users submit this form."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created Records</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const hasCreatedRecords = submission.created_external_contact_id || 
                  submission.created_crm_client_id || 
                  submission.created_task_id;
                const identifier = submission.submitter_name || submission.submitter_email || "Anonymous";
                
                return (
                  <TableRow key={submission.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(submission.submitted_at), "h:mm a")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{identifier}</span>
                    </TableCell>
                    <TableCell>
                      {submission.submitter_email ? (
                        <a 
                          href={`mailto:${submission.submitter_email}`} 
                          className="text-sm text-primary hover:underline"
                        >
                          {submission.submitter_email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {submission.created_external_contact_id && (
                          <Badge variant="default" className="text-xs gap-1">
                            <User className="h-3 w-3" />
                            Contact
                          </Badge>
                        )}
                        {submission.created_crm_client_id && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />
                            CRM
                          </Badge>
                        )}
                        {submission.created_task_id && (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckSquare className="h-3 w-3" />
                            Task
                          </Badge>
                        )}
                        {!hasCreatedRecords && (
                          <span className="text-muted-foreground text-xs italic">No records created</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSubmissionToDelete(submission);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <SubmissionDetailSheet
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
              Linked records (contacts, CRM, tasks) will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FormSubmissionsPage() {
  return (
    <ModuleGuard moduleKey="forms" moduleName="Forms & Workflows">
      <FormSubmissionsContent />
    </ModuleGuard>
  );
}
