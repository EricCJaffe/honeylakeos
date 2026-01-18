import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckSquare, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Lightbulb
} from "lucide-react";
import { 
  FrameworkFinancePlaybookItem, 
  ConditionKey 
} from "@/hooks/useFrameworkFinancePlaybook";

interface PlaybookItemCardProps {
  item: FrameworkFinancePlaybookItem;
  onCreateTask?: () => void;
  onCreateNote?: () => void;
}

function PlaybookItemCard({ item, onCreateTask, onCreateNote }: PlaybookItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && item.description && (
        <CardContent className="pt-0">
          <CardDescription className="text-sm mb-3">{item.description}</CardDescription>
          <div className="flex gap-2">
            {onCreateTask && (
              <Button size="sm" variant="outline" onClick={onCreateTask}>
                <CheckSquare className="h-3 w-3 mr-1" />
                Create Task
              </Button>
            )}
            {onCreateNote && (
              <Button size="sm" variant="outline" onClick={onCreateNote}>
                <FileText className="h-3 w-3 mr-1" />
                Create Note
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface FinancePlaybookPromptsProps {
  playbookItems: FrameworkFinancePlaybookItem[];
  triggeredConditions: ConditionKey[];
  onCreateTask?: (item: FrameworkFinancePlaybookItem) => void;
  onCreateNote?: (item: FrameworkFinancePlaybookItem) => void;
}

export function FinancePlaybookPrompts({
  playbookItems,
  triggeredConditions,
  onCreateTask,
  onCreateNote,
}: FinancePlaybookPromptsProps) {
  // Filter playbook items to only show triggered ones
  const triggeredItems = playbookItems.filter((item) =>
    triggeredConditions.includes(item.condition_key as ConditionKey)
  );

  if (triggeredItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lightbulb className="h-5 w-5 text-green-500" />
            <span>All financial metrics are within target ranges.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          What Changed?
        </h3>
        <Badge variant="secondary">{triggeredItems.length} action{triggeredItems.length !== 1 ? "s" : ""}</Badge>
      </div>
      <div className="space-y-3">
        {triggeredItems.map((item) => (
          <PlaybookItemCard
            key={item.id}
            item={item}
            onCreateTask={onCreateTask ? () => onCreateTask(item) : undefined}
            onCreateNote={onCreateNote ? () => onCreateNote(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
