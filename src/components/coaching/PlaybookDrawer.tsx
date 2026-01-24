import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  ListTodo,
  Share2,
  FileText,
  Clock,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FrameworkPlaybook, PlaybookAction } from "@/hooks/useCoachPlaybooks";

interface PlaybookDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbook: FrameworkPlaybook | null;
  clientCompanyId?: string;
  onActionSelect?: (action: PlaybookAction) => void;
}

const actionIcons = {
  create_session: Calendar,
  suggest_task: ListTodo,
  request_share: Share2,
  send_checklist: FileText,
};

const actionLabels = {
  create_session: "Create Coaching Session",
  suggest_task: "Suggest Task to Client",
  request_share: "Request Report Share",
  send_checklist: "Send Internal Checklist",
};

export function PlaybookDrawer({
  open,
  onOpenChange,
  playbook,
  clientCompanyId,
  onActionSelect,
}: PlaybookDrawerProps) {
  if (!playbook) return null;

  const actions = playbook.recommended_actions_json || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <SheetTitle>{playbook.name}</SheetTitle>
          </div>
          {playbook.description && (
            <SheetDescription>{playbook.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Trigger Conditions */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              When to use this playbook
            </h4>
            <div className="flex flex-wrap gap-2">
              {playbook.trigger_conditions_json.alert_types?.map((type) => (
                <Badge key={type} variant="outline">
                  {type.replace(/_/g, " ")}
                </Badge>
              ))}
              {playbook.trigger_conditions_json.score_threshold && (
                <Badge variant="outline">
                  Score &lt; {playbook.trigger_conditions_json.score_threshold}%
                </Badge>
              )}
              {playbook.trigger_conditions_json.inactivity_days && (
                <Badge variant="outline">
                  {playbook.trigger_conditions_json.inactivity_days}+ days inactive
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Recommended Actions */}
          <div>
            <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recommended Actions
            </h4>

            <div className="space-y-3">
              {actions.map((action, index) => {
                const Icon = actionIcons[action.cta_type] || FileText;

                return (
                  <Card
                    key={index}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => onActionSelect?.(action)}
                  >
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {action.title}
                            </CardTitle>
                            {action.description && (
                              <CardDescription className="text-xs mt-1">
                                {action.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-0 px-4 pb-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {action.suggested_duration_minutes || 15} min
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {actionLabels[action.cta_type]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {actions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recommended actions defined for this playbook
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Compact playbook card for dashboard
export function PlaybookCard({
  playbook,
  onClick,
}: {
  playbook: FrameworkPlaybook;
  onClick?: () => void;
}) {
  const actionCount = playbook.recommended_actions_json?.length || 0;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{playbook.name}</p>
              <p className="text-xs text-muted-foreground">
                {actionCount} action{actionCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
