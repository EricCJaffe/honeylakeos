import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveExitSurvey, useExitSurveyMutations, type ExitSurveyQuestion } from "@/hooks/useExitSurvey";
import { Pencil } from "lucide-react";

const CATEGORIES = ["KPI", "Admissions", "Patient Services", "Treatment Team", "Treatment Program", "Facility", "General"];

const CATEGORY_COLORS: Record<string, string> = {
  KPI: "bg-purple-100 text-purple-700 border-purple-200",
  Admissions: "bg-blue-100 text-blue-700 border-blue-200",
  "Patient Services": "bg-teal-100 text-teal-700 border-teal-200",
  "Treatment Team": "bg-green-100 text-green-700 border-green-200",
  "Treatment Program": "bg-indigo-100 text-indigo-700 border-indigo-200",
  Facility: "bg-orange-100 text-orange-700 border-orange-200",
  General: "bg-gray-100 text-gray-700 border-gray-200",
};

export function QuestionsTab() {
  const { questions } = useActiveExitSurvey();
  const { updateQuestion } = useExitSurveyMutations();
  const [editingQuestion, setEditingQuestion] = useState<ExitSurveyQuestion | null>(null);

  const allQuestions = questions.data || [];

  function handleToggleActive(q: ExitSurveyQuestion) {
    updateQuestion.mutate({ questionId: q.id, updates: { is_active: !q.is_active } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allQuestions.length} questions · Click a row to edit
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Question</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Department</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {questions.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={8} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                allQuestions.map((q) => (
                  <tr key={q.id} className="border-b hover:bg-muted/10">
                    <td className="px-4 py-3 text-muted-foreground">{q.question_number}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="line-clamp-2 text-sm">{q.text}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${CATEGORY_COLORS[q.category] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {q.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="text-xs">
                        {q.type === "open_ended" ? "Open-ended" : "Scored"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{q.department ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{q.owner_name ?? "—"}</td>
                    <td className="px-3 py-3 text-center">
                      <Switch
                        checked={q.is_active}
                        onCheckedChange={() => handleToggleActive(q)}
                        disabled={updateQuestion.isPending}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingQuestion(q)}
                        className="h-7 gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <QuestionEditDialog
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSave={(updates) => {
          if (editingQuestion) {
            updateQuestion.mutate(
              { questionId: editingQuestion.id, updates },
              { onSuccess: () => setEditingQuestion(null) }
            );
          }
        }}
        saving={updateQuestion.isPending}
      />
    </div>
  );
}

function QuestionEditDialog({
  question,
  onClose,
  onSave,
  saving,
}: {
  question: ExitSurveyQuestion | null;
  onClose: () => void;
  onSave: (updates: Partial<ExitSurveyQuestion>) => void;
  saving: boolean;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [threshold, setThreshold] = useState("3");

  // Reset when question changes
  if (question && text !== question.text && !saving) {
    setText(question.text);
    setCategory(question.category);
    setDepartment(question.department ?? "");
    setOwnerName(question.owner_name ?? "");
    setOwnerEmail(question.owner_email ?? "");
    setThreshold(String(question.comment_threshold ?? 3));
  }

  function handleSave() {
    onSave({
      text,
      category,
      department: department || null,
      owner_name: ownerName || null,
      owner_email: ownerEmail || null,
      comment_threshold: parseInt(threshold) || 3,
    });
  }

  return (
    <Dialog open={!!question} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question {question?.question_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Question Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-none mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alert Threshold</Label>
              <Select value={threshold} onValueChange={setThreshold}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>Score ≤ {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Owner Name</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Owner Email</Label>
              <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
