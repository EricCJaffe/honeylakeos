import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Calendar,
  Vote,
  ListOrdered,
  Layers,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  useListeningSessions,
  useListeningItems,
  useListeningItemComments,
  type ListeningItem,
  type ListeningItemComment,
} from "@/hooks/useListeningSessions";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  in_progress: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-200", label: "In Progress" },
  assigned:    { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-200", label: "Assigned" },
  discuss:     { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-200", label: "To Discuss" },
  clarify:     { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-800 dark:text-orange-200", label: "Needs Clarification" },
  new:         { bg: "bg-gray-100 dark:bg-gray-800/30", text: "text-gray-800 dark:text-gray-200", label: "New" },
};

const THEME_LABELS: Record<string, string> = {
  growth:    "Growth & New Programs",
  patient:   "Patient Experience",
  people:    "People & Culture",
  reach:     "Reach & Marketing",
  systems:   "Systems & Technology",
  codify:    "Codify & Standardize",
  structure: "Structure & Communication",
};

const THEME_COLORS: Record<string, string> = {
  growth:    "border-l-emerald-500",
  patient:   "border-l-blue-500",
  people:    "border-l-violet-500",
  reach:     "border-l-amber-500",
  systems:   "border-l-cyan-500",
  codify:    "border-l-rose-500",
  structure: "border-l-slate-500",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.new;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function VoteBadge({ votes }: { votes: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
      <Vote className="h-3 w-3" />
      {votes} {votes === 1 ? "vote" : "votes"}
    </span>
  );
}

function ItemRow({ item, comments }: { item: ListeningItem; comments: ListeningItemComment[] }) {
  const [expanded, setExpanded] = useState(false);
  const itemComments = comments.filter((c) => c.item_id === item.id);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{item.text}</p>
          {item.owner_text && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.owner_text}
            </p>
          )}
          {item.status_note && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {item.status_note}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <VoteBadge votes={item.votes} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      {item.comments && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          {item.comments}
        </p>
      )}

      {itemComments.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <MessageSquare className="h-3 w-3" />
          {itemComments.length} {itemComments.length === 1 ? "comment" : "comments"}
        </button>
      )}

      {expanded && itemComments.length > 0 && (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          {itemComments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium">{c.author_name}</span>
              <span className="text-muted-foreground ml-1">
                {format(new Date(c.created_at), "MMM d")}
              </span>
              <p className="text-muted-foreground mt-0.5">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ByQuestionTab({
  items,
  comments,
  questions,
}: {
  items: ListeningItem[];
  comments: ListeningItemComment[];
  questions: { no: number; text: string }[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, ListeningItem[]>();
    for (const item of items) {
      const list = map.get(item.question_no) ?? [];
      list.push(item);
      map.set(item.question_no, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        const qItems = grouped.get(q.no) ?? [];
        const totalVotes = qItems.reduce((s, i) => s + i.votes, 0);
        return (
          <Card key={q.no}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">
                  <span className="text-muted-foreground mr-2">Q{q.no}.</span>
                  {q.text}
                </CardTitle>
                <Badge variant="secondary" className="flex-shrink-0">
                  {totalVotes} votes · {qItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {qItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No responses.</p>
              ) : (
                qItems.map((item) => (
                  <ItemRow key={item.id} item={item} comments={comments} />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface ThemeGroup {
  theme: string;
  label: string;
  totalVotes: number;
  clusters: {
    name: string;
    items: ListeningItem[];
    totalVotes: number;
    underway: number;
    toDiscuss: number;
  }[];
}

function ByThemeTab({
  items,
  comments,
}: {
  items: ListeningItem[];
  comments: ListeningItemComment[];
}) {
  const themes = useMemo<ThemeGroup[]>(() => {
    const themeMap = new Map<string, Map<string, ListeningItem[]>>();
    for (const item of items) {
      const t = item.theme ?? "other";
      const c = item.cluster ?? item.text;
      if (!themeMap.has(t)) themeMap.set(t, new Map());
      const clusterMap = themeMap.get(t)!;
      if (!clusterMap.has(c)) clusterMap.set(c, []);
      clusterMap.get(c)!.push(item);
    }

    const result: ThemeGroup[] = [];
    for (const [theme, clusterMap] of themeMap) {
      const clusters = Array.from(clusterMap.entries()).map(([name, clusterItems]) => ({
        name,
        items: clusterItems.sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order),
        totalVotes: clusterItems.reduce((s, i) => s + i.votes, 0),
        underway: clusterItems.filter((i) => i.status === "in_progress" || i.status === "assigned").length,
        toDiscuss: clusterItems.filter((i) => i.status === "discuss" || i.status === "clarify").length,
      }));
      clusters.sort((a, b) => b.totalVotes - a.totalVotes);

      result.push({
        theme,
        label: THEME_LABELS[theme] ?? theme.charAt(0).toUpperCase() + theme.slice(1),
        totalVotes: clusters.reduce((s, c) => s + c.totalVotes, 0),
        clusters,
      });
    }
    result.sort((a, b) => b.totalVotes - a.totalVotes);
    return result;
  }, [items]);

  return (
    <div className="space-y-6">
      {themes.map((tg, idx) => (
        <Card key={tg.theme} className={`border-l-4 ${THEME_COLORS[tg.theme] ?? "border-l-gray-400"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Theme {idx + 1} of {themes.length}
                </p>
                <CardTitle className="text-lg">{tg.label}</CardTitle>
              </div>
              <Badge variant="default" className="text-sm flex-shrink-0">
                {tg.totalVotes} votes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tg.clusters.map((cluster) => (
              <div key={cluster.name} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{cluster.name}</h4>
                  <div className="flex items-center gap-2">
                    <VoteBadge votes={cluster.totalVotes} />
                    {cluster.underway > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {cluster.underway} underway
                      </span>
                    )}
                    {cluster.toDiscuss > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {cluster.toDiscuss} to discuss
                      </span>
                    )}
                  </div>
                </div>
                {cluster.items.map((item) => (
                  <ItemRow key={item.id} item={item} comments={comments} />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ListeningSessionPage() {
  const { data: sessions = [], isLoading: sessionsLoading } = useListeningSessions();

  const session = sessions[0];
  const { data: items = [], isLoading: itemsLoading } = useListeningItems(session?.id);
  const { data: comments = [] } = useListeningItemComments(session?.id);

  const isLoading = sessionsLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Listening Session"
          description="No listening session found."
        />
        <EmptyState
          icon={MessageSquare}
          title="No listening session"
          description="There is no listening session for this company yet."
        />
      </div>
    );
  }

  const totalVotes = items.reduce((s, i) => s + i.votes, 0);
  const questions = (session.questions ?? []) as { no: number; text: string }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.title}
        description={`Held on ${format(new Date(session.held_on), "MMMM d, yyyy")} · ${items.length} proposals · ${totalVotes} total votes`}
      />

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {format(new Date(session.held_on), "MMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1">
          <Vote className="h-4 w-4" />
          {totalVotes} votes
        </span>
        <span className="flex items-center gap-1">
          <Layers className="h-4 w-4" />
          {new Set(items.map((i) => i.theme).filter(Boolean)).size} themes
        </span>
      </div>

      <Tabs defaultValue="by-question">
        <TabsList>
          <TabsTrigger value="by-question" className="gap-1.5">
            <ListOrdered className="h-4 w-4" />
            By Question
          </TabsTrigger>
          <TabsTrigger value="by-theme" className="gap-1.5">
            <Layers className="h-4 w-4" />
            By Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-question" className="mt-4">
          <ByQuestionTab items={items} comments={comments} questions={questions} />
        </TabsContent>

        <TabsContent value="by-theme" className="mt-4">
          <ByThemeTab items={items} comments={comments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
