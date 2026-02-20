import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

// Honey Lake Clinic company_id — public form hard-codes this
const COMPANY_ID = "9ea3677d-be6c-46df-a41c-d22f01e88756";

type Question = {
  id: string;
  question_number: number;
  text: string;
  category: string;
  type: "scored" | "open_ended";
};

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

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

export default function PublicSurveyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Patient info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [psychProvider, setPsychProvider] = useState("");
  const [primaryTherapist, setPrimaryTherapist] = useState("");
  const [caseManager, setCaseManager] = useState("");

  // Responses: question_id -> { score?, comment?, open_ended? }
  const [responses, setResponses] = useState<Record<string, { score?: number; comment?: string }>>({});
  const [openEnded, setOpenEnded] = useState<Record<string, string>>({});

  const scoredQuestions = questions.filter((q) => q.type === "scored");
  const openEndedQuestions = questions.filter((q) => q.type === "open_ended");

  const scoredGroups = useMemo(() => {
    const groups: { category: string; questions: Question[] }[] = [];
    const indexByCategory = new Map<string, number>();

    for (const q of scoredQuestions) {
      const key = q.category || "General";
      if (!indexByCategory.has(key)) {
        indexByCategory.set(key, groups.length);
        groups.push({ category: key, questions: [] });
      }
      groups[indexByCategory.get(key)!].questions.push(q);
    }

    return groups;
  }, [scoredQuestions]);

  // Steps: intro(0), category sections(1..n), providers(n+1), open-ended(n+2)
  const INTRO_STEP = 0;
  const CATEGORY_START = 1;
  const CATEGORY_END = scoredGroups.length;
  const PROVIDERS_STEP = scoredGroups.length + 1;
  const OPEN_ENDED_STEP = scoredGroups.length + 2;
  const totalSteps = scoredGroups.length + 3; // intro + categories + providers + open-ended

  useEffect(() => {
    async function fetchSurvey() {
      const { data: defData } = await supabase
        .from("exit_survey_definitions")
        .select("id")
        .eq("company_id", COMPANY_ID)
        .eq("is_active", true)
        .single();

      if (!defData) { setLoading(false); return; }
      setDefinitionId(defData.id);

      const { data: qData } = await supabase
        .from("exit_survey_questions")
        .select("id, question_number, text, category, type")
        .eq("company_id", COMPANY_ID)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setQuestions((qData || []) as Question[]);
      setLoading(false);
    }
    fetchSurvey();
  }, []);

  const progressPct = totalSteps > 1
    ? Math.round((currentIndex / (totalSteps - 1)) * 100)
    : 0;

  function setScore(questionId: string, score: number) {
    setResponses((prev) => ({ ...prev, [questionId]: { ...prev[questionId], score } }));
  }

  function setComment(questionId: string, comment: string) {
    setResponses((prev) => ({ ...prev, [questionId]: { ...prev[questionId], comment } }));
  }

  function canAdvance() {
    if (currentIndex === INTRO_STEP) return true;
    if (currentIndex >= CATEGORY_START && currentIndex <= CATEGORY_END) {
      const group = scoredGroups[currentIndex - CATEGORY_START];
      if (!group) return true;
      return group.questions.every((q) => !!responses[q.id]?.score);
    }
    return true;
  }

  function advance() {
    if (currentIndex < totalSteps - 1) setCurrentIndex((i) => i + 1);
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Insert submission
      const { data: sub, error: subErr } = await supabase
        .from("exit_survey_submissions")
        .insert({
          company_id: COMPANY_ID,
          definition_id: definitionId,
          patient_first_name: firstName || null,
          patient_last_name: lastName || null,
          psych_provider: psychProvider || null,
          primary_therapist: primaryTherapist || null,
          case_manager: caseManager || null,
          open_ended_improvement: openEnded[openEndedQuestions.find(q => q.question_number === 27)?.id ?? ""] || null,
          open_ended_positive: openEnded[openEndedQuestions.find(q => q.question_number === 28)?.id ?? ""] || null,
          is_anonymous: !firstName && !lastName,
        })
        .select("id")
        .single();

      if (subErr || !sub) throw subErr ?? new Error("Failed to create submission");

      // Insert responses for scored questions
      const responseRows = scoredQuestions
        .filter((q) => responses[q.id]?.score)
        .map((q) => ({
          submission_id: sub.id,
          question_id: q.id,
          score: responses[q.id].score!,
          comment: responses[q.id].comment || null,
        }));

      if (responseRows.length > 0) {
        const { error: respErr } = await supabase
          .from("exit_survey_responses")
          .insert(responseRows);
        if (respErr) throw respErr;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Survey submit error:", err);
      alert("There was an error submitting your survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center"
        >
          <CheckCircle2 className="w-16 h-16 text-teal-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Thank You!</h1>
          <p className="text-gray-600 mb-2">
            Your feedback means the world to us and helps us continue improving our care.
          </p>
          <p className="text-sm text-gray-400">
            We wish you all the best on your continued journey.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <img src="/hlc-logo.svg" alt="Honey Lake Clinic" className="h-8 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <span className="font-semibold text-gray-700">Exit Survey</span>
      </div>

      {/* Progress bar */}
      {currentIndex > INTRO_STEP && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>
              {currentIndex >= CATEGORY_START && currentIndex <= CATEGORY_END
                ? `Section ${currentIndex} of ${scoredGroups.length}`
                : currentIndex === PROVIDERS_STEP
                ? "Provider Information"
                : "Final Questions"}
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
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">

            {/* Intro step */}
            {currentIndex === INTRO_STEP && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-md p-8"
              >
                <h1 className="text-2xl font-bold text-gray-800 mb-3">Patient Exit Survey</h1>
                <p className="text-gray-600 mb-6">
                  Your feedback is deeply valued and helps us provide the best care possible.
                  This survey takes about 5 minutes to complete.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Optional"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Optional"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    You may leave your name blank to respond anonymously.
                  </p>
                </div>
                <Button onClick={advance} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
                  Begin Survey <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Category section step */}
            {currentIndex >= CATEGORY_START && currentIndex <= CATEGORY_END && (
              <motion.div
                key={`cat-${currentIndex}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl shadow-md p-8"
              >
                {(() => {
                  const group = scoredGroups[currentIndex - CATEGORY_START];
                  return (
                    <>
                      <div className="mb-4">
                        <span className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                          {group?.category ?? "General"}
                        </span>
                      </div>

                      <div className="space-y-6 mb-6">
                        {(group?.questions ?? []).map((q) => (
                          <div key={q.id} className="border rounded-xl p-4">
                            <p className="text-sm font-semibold text-gray-800 mb-3 leading-snug">
                              {q.text}
                            </p>

                            {/* Rating buttons */}
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {[1, 2, 3, 4, 5].map((val) => {
                                const selected = responses[q.id]?.score === val;
                                return (
                                  <button
                                    key={val}
                                    onClick={() => setScore(q.id, val)}
                                    className={`flex-1 min-w-[48px] min-h-[48px] rounded-lg border-2 font-bold text-base transition-all duration-150
                                      ${selected
                                        ? RATING_SELECTED[val]
                                        : RATING_COLORS[val]
                                      }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Label row */}
                            <div className="flex justify-between text-xs text-gray-400 mb-3">
                              <span>Strongly Disagree</span>
                              <span>Strongly Agree</span>
                            </div>

                            {/* Comment box — optional for Q3–Q26 */}
                            {q.question_number >= 3 && q.question_number <= 26 && (
                              <>
                                <Label className="text-xs text-gray-600 mb-1 block">
                                  Would you like to share more? (Optional)
                                </Label>
                                <Textarea
                                  placeholder="Please tell us more..."
                                  value={responses[q.id]?.comment ?? ""}
                                  onChange={(e) => setComment(q.id, e.target.value)}
                                  className="resize-none"
                                  rows={3}
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goBack} className="h-11">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={advance}
                    disabled={!canAdvance()}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-11"
                  >
                    {currentIndex === CATEGORY_END ? "Continue" : "Next"}
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Providers step */}
            {currentIndex === PROVIDERS_STEP && (
              <motion.div
                key="providers"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="bg-white rounded-2xl shadow-md p-8"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-2">Your Care Team</h2>
                <p className="text-sm text-gray-500 mb-5">Optional — helps us route your feedback</p>
                <div className="space-y-4 mb-6">
                  <div>
                    <Label>Psychiatrist / Psychiatric Provider</Label>
                    <Input
                      placeholder="Optional"
                      value={psychProvider}
                      onChange={(e) => setPsychProvider(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Primary Therapist</Label>
                    <Input
                      placeholder="Optional"
                      value={primaryTherapist}
                      onChange={(e) => setPrimaryTherapist(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Case Manager</Label>
                    <Input
                      placeholder="Optional"
                      value={caseManager}
                      onChange={(e) => setCaseManager(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goBack} className="h-11">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={advance}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-11"
                  >
                    Next <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Open-ended step */}
            {currentIndex === OPEN_ENDED_STEP && (
              <motion.div
                key="open-ended"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="bg-white rounded-2xl shadow-md p-8"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-5">Final Questions</h2>
                <div className="space-y-5 mb-6">
                  {openEndedQuestions.map((q) => (
                    <div key={q.id}>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                        {q.text}
                      </Label>
                      <Textarea
                        placeholder="Your response (optional)..."
                        value={openEnded[q.id] ?? ""}
                        onChange={(e) => setOpenEnded((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goBack} className="h-11">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-11"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
                    ) : (
                      "Submit Survey"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
