import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
  FeedbackSeverity,
  useFeedbackItems,
  useTriageFeedback,
} from "@/hooks/usePilotValidation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";

interface FeedbackTriagePanelProps {
  companyId?: string;
  hideCompanyColumn?: boolean;
}

const FEEDBACK_TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  confusion: HelpCircle,
};

const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "text-red-600 dark:text-red-400",
  idea: "text-blue-600 dark:text-blue-400",
  confusion: "text-amber-600 dark:text-amber-400",
};

const SEVERITY_ICONS: Record<FeedbackSeverity, typeof AlertTriangle> = {
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
};

const SEVERITY_COLORS: Record<FeedbackSeverity, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

const STATUS_ICONS: Record<FeedbackStatus, typeof Clock> = {
  open: Clock,
  triaged: CheckCircle2,
  done: CheckCircle2,
  dismissed: XCircle,
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: "text-amber-600",
  triaged: "text-blue-600",
  done: "text-green-600",
  dismissed: "text-muted-foreground",
};

export function FeedbackTriagePanel({ companyId, hideCompanyColumn }: FeedbackTriagePanelProps) {
  const [statusFilter, setStatusFilter] = React.useState<FeedbackStatus | "all">("open");
  const [typeFilter, setTypeFilter] = React.useState<FeedbackType | "all">("all");
  const [selectedFeedback, setSelectedFeedback] = React.useState<FeedbackItem | null>(null);

  const { data: feedbackItems, isLoading } = useFeedbackItems({
    companyId,
    status: statusFilter !== "all" ? statusFilter : undefined,
    feedbackType: typeFilter !== "all" ? typeFilter : undefined,
  });

  const triageMutation = useTriageFeedback();

  const handleStatusChange = (feedbackId: string, newStatus: FeedbackStatus, notes?: string) => {
    const item = feedbackItems?.find((f) => f.id === feedbackId);
    if (!item) return;
    triageMutation.mutate({
      feedbackId,
      companyId: item.company_id,
      status: newStatus,
      triageNotes: notes,
    });
    setSelectedFeedback(null);
  };

  const isPending = triageMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeedbackStatus | "all")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FeedbackType | "all")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">Bugs</SelectItem>
            <SelectItem value="idea">Ideas</SelectItem>
            <SelectItem value="confusion">Confusion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : !feedbackItems?.length ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No feedback items found.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {feedbackItems.map((item) => (
              <FeedbackItemRow
                key={item.id}
                item={item}
                hideCompanyColumn={hideCompanyColumn}
                onClick={() => setSelectedFeedback(item)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onStatusChange={handleStatusChange}
        isPending={isPending}
      />
    </div>
  );
}

interface FeedbackItemRowProps {
  item: FeedbackItem;
  hideCompanyColumn?: boolean;
  onClick: () => void;
}

function FeedbackItemRow({ item, hideCompanyColumn, onClick }: FeedbackItemRowProps) {
  const TypeIcon = FEEDBACK_TYPE_ICONS[item.feedback_type];
  const SeverityIcon = SEVERITY_ICONS[item.severity];
  const StatusIcon = STATUS_ICONS[item.status];

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full bg-muted", FEEDBACK_TYPE_COLORS[item.feedback_type])}>
            <TypeIcon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {!hideCompanyColumn && item.company && (
                <Badge variant="outline" className="text-xs">
                  {item.company.name}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs capitalize">
                {item.feedback_type}
              </Badge>
              <div className={cn("flex items-center gap-1", SEVERITY_COLORS[item.severity])}>
                <SeverityIcon className="h-3 w-3" />
                <span className="text-xs capitalize">{item.severity}</span>
              </div>
            </div>

            <p className="text-sm line-clamp-2">{item.message}</p>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{item.page_path}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
            </div>
          </div>

          <div className={cn("flex items-center gap-1", STATUS_COLORS[item.status])}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-xs capitalize">{item.status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeedbackDetailDialogProps {
  feedback: FeedbackItem | null;
  onClose: () => void;
  onStatusChange: (id: string, status: FeedbackStatus, notes?: string) => void;
  isPending: boolean;
}

function FeedbackDetailDialog({ feedback, onClose, onStatusChange, isPending }: FeedbackDetailDialogProps) {
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (feedback) {
      setNotes(feedback.triage_notes || "");
    }
  }, [feedback]);

  if (!feedback) return null;

  const TypeIcon = FEEDBACK_TYPE_ICONS[feedback.feedback_type];

  return (
    <Dialog open={!!feedback} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full bg-muted", FEEDBACK_TYPE_COLORS[feedback.feedback_type])}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="capitalize">{feedback.feedback_type} Report</DialogTitle>
              <DialogDescription>
                {feedback.company?.name} • {feedback.page_path}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{feedback.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Severity:</span>
              <span className="ml-2 capitalize">{feedback.severity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 capitalize">{feedback.status}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted:</span>
              <span className="ml-2">
                {new Date(feedback.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Module:</span>
              <span className="ml-2">{feedback.module_key || "—"}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Triage Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this feedback..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(feedback.id, "dismissed", notes)}
            disabled={isPending}
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(feedback.id, "triaged", notes)}
            disabled={isPending}
          >
            Mark Triaged
          </Button>
          <Button
            size="sm"
            onClick={() => onStatusChange(feedback.id, "done", notes)}
            disabled={isPending}
          >
            Mark Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
