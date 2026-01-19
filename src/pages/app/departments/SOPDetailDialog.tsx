import { format } from "date-fns";
import { Clock, User, Eye, Tag, Link2, Calendar, AlertCircle, Wrench, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSOP, useSOPRevisions, useDepartmentSOPs, type SOP } from "@/hooks/useSOPs";

interface SOPDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sopId: string;
  onEdit?: () => void;
}

export function SOPDetailDialog({
  open,
  onOpenChange,
  sopId,
  onEdit,
}: SOPDetailDialogProps) {
  const { data: sop, isLoading } = useSOP(sopId);
  const { data: revisions } = useSOPRevisions(sopId);
  const { data: departmentSOPs } = useDepartmentSOPs(sop?.department_id);

  if (isLoading || !sop) {
    return null;
  }

  const relatedSOPs = departmentSOPs?.filter((s) => sop.related_sop_ids?.includes(s.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{sop.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={sop.visibility === "company_public" ? "default" : "secondary"}>
                  <Eye className="mr-1 h-3 w-3" />
                  {sop.visibility === "company_public" ? "Company Public" : "Department Only"}
                </Badge>
                <span>•</span>
                <span>Version {sop.current_version}</span>
              </div>
            </div>
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                Edit SOP
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-1 h-4 w-4" />
              History ({revisions?.length || 0})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] mt-4">
            <TabsContent value="content" className="space-y-6 mt-0">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sop.owner_role && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Owner Role</p>
                      <p className="font-medium">{sop.owner_role}</p>
                    </div>
                  </div>
                )}
                {sop.last_reviewed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Last Reviewed</p>
                      <p className="font-medium">{format(new Date(sop.last_reviewed_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
                {sop.next_review_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Next Review</p>
                      <p className="font-medium">{format(new Date(sop.next_review_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Updated</p>
                    <p className="font-medium">{format(new Date(sop.updated_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {sop.tags && sop.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {sop.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              {/* Purpose */}
              {sop.purpose && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Purpose</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sop.purpose}</p>
                  </CardContent>
                </Card>
              )}

              {/* Scope */}
              {sop.scope && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Scope</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sop.scope}</p>
                  </CardContent>
                </Card>
              )}

              {/* Tools & Systems */}
              {sop.tools_systems && sop.tools_systems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Tools / Systems Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sop.tools_systems.map((tool) => (
                        <Badge key={tool} variant="secondary">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Procedure Steps */}
              {sop.procedure_steps && sop.procedure_steps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Step-by-Step Procedure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sop.procedure_steps.map((step, index) => (
                      <div key={step.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <Badge className="h-6 w-6 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.title}</p>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Exceptions / Notes */}
              {sop.exceptions_notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Exceptions / Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sop.exceptions_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Related SOPs */}
              {relatedSOPs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Related SOPs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {relatedSOPs.map((related) => (
                        <Badge key={related.id} variant="outline">
                          {related.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="space-y-4">
                {revisions?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No revision history available.
                  </p>
                )}

                {revisions?.map((revision) => (
                  <Card key={revision.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">v{revision.version}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(revision.revised_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {revision.change_summary && (
                            <p className="text-sm mt-2">{revision.change_summary}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
