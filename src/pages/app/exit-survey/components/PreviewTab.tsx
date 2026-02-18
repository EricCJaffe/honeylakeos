import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveExitSurvey } from "@/hooks/useExitSurvey";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";

const RATING_COLORS: Record<number, string> = {
  1: "bg-red-100 border-red-400 text-red-700 hover:bg-red-200",
  2: "bg-orange-100 border-orange-400 text-orange-700 hover:bg-orange-200",
  3: "bg-yellow-100 border-yellow-400 text-yellow-700 hover:bg-yellow-200",
  4: "bg-teal-100 border-teal-400 text-teal-700 hover:bg-teal-200",
  5: "bg-green-100 border-green-400 text-green-700 hover:bg-green-200",
};

const RATING_SELECTED: Record<number, string> = {
  1: "bg-red-500 border-red-600 text-white",
  2: "bg-orange-500 border-orange-600 text-white",
  3: "bg-yellow-500 border-yellow-600 text-white",
  4: "bg-teal-500 border-teal-600 text-white",
  5: "bg-green-500 border-green-600 text-white",
};

export function PreviewTab() {
  const { questions } = useActiveExitSurvey();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  const scoredQuestions = (questions.data || []).filter((q) => q.type === "scored");
  const openEndedQuestions = (questions.data || []).filter((q) => q.type === "open_ended");
  const totalSteps = scoredQuestions.length + 1; // +1 for open-ended step

  if (questions.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-8 max-w-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview Complete</h3>
          <p className="text-sm text-gray-500 mb-4">
            This was a dry run — no data was submitted.
          </p>
          <Badge variant="outline" className="text-xs mb-4 border-teal-300 text-teal-700">
            {Object.keys(responses).length} questions answered
          </Badge>
          <Button
            onClick={() => { setCurrentIndex(0); setResponses({}); setComments({}); setCompleted(false); }}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset Preview
          </Button>
        </div>
      </div>
    );
  }

  const progressPct = totalSteps > 0 ? Math.round((currentIndex / totalSteps) * 100) : 0;
  const currentQuestion = currentIndex < scoredQuestions.length
    ? scoredQuestions[currentIndex]
    : null;
  const isOpenEnded = currentIndex === scoredQuestions.length;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Preview notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-medium text-amber-700">Preview Mode</span>
        <span className="text-xs text-amber-600">— responses will not be saved</span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {isOpenEnded ? "Final Questions" : `Question ${currentIndex + 1} of ${scoredQuestions.length}`}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Scored question */}
        {currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl border p-6 shadow-sm"
          >
            <span className="text-xs text-teal-600 font-medium uppercase tracking-wide mb-2 block">
              {currentQuestion.category}
            </span>
            <p className="text-base font-semibold text-gray-800 mb-5">{currentQuestion.text}</p>

            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((val) => {
                const selected = responses[currentQuestion.id] === val;
                return (
                  <button
                    key={val}
                    onClick={() => setResponses((prev) => ({ ...prev, [currentQuestion.id]: val }))}
                    className={`flex-1 min-h-[48px] rounded-xl border-2 font-bold text-lg transition-all duration-150
                      ${selected ? RATING_SELECTED[val] : RATING_COLORS[val]}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-gray-400 mb-4">
              <span>Strongly Disagree</span>
              <span>Strongly Agree</span>
            </div>

            <AnimatePresence>
              {responses[currentQuestion.id] !== undefined && responses[currentQuestion.id] <= 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <Label className="text-sm text-gray-600 mb-1 block">
                    Would you like to share more? (Optional)
                  </Label>
                  <Textarea
                    placeholder="Please tell us more..."
                    value={comments[currentQuestion.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    rows={2}
                    className="resize-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => i - 1)}
                disabled={currentIndex === 0}
                className="h-10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={!responses[currentQuestion.id]}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-10"
              >
                Next <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Open-ended step */}
        {isOpenEnded && (
          <motion.div
            key="open-ended"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white rounded-xl border p-6 shadow-sm"
          >
            <h3 className="text-base font-semibold mb-4">Final Questions</h3>
            <div className="space-y-4 mb-5">
              {openEndedQuestions.map((q) => (
                <div key={q.id}>
                  <Label className="text-sm font-medium mb-1 block">{q.text}</Label>
                  <Textarea
                    placeholder="Your response (preview only)..."
                    rows={3}
                    className="resize-none"
                    disabled
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentIndex((i) => i - 1)} className="h-10">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setCompleted(true)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-10"
              >
                Finish Preview
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
