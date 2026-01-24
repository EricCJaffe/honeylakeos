import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextField } from "@/components/ui/rich-text-field";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { useOpportunityComments, useCreateOpportunityComment } from "@/hooks/useOpportunityComments";

interface OpportunityCommentsThreadProps {
  opportunityId: string;
}

export function OpportunityCommentsThread({ opportunityId }: OpportunityCommentsThreadProps) {
  const { data: comments = [], isLoading } = useOpportunityComments(opportunityId);
  const createComment = useCreateOpportunityComment();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      opportunityId,
      bodyRichText: newComment,
    });
    setNewComment("");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Activity / Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity / Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments Thread */}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Add a note about calls, emails, or meetings.
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.author?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.author?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.author?.full_name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <div className="text-sm bg-muted/50 rounded-lg p-3">
                    <RichTextDisplay content={comment.body_rich_text} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Composer */}
        <form onSubmit={handleSubmit} className="border-t pt-4">
          <div className="space-y-3">
            <RichTextField
              label=""
              value={newComment}
              onChange={setNewComment}
              placeholder="Add a comment about a call, email, or meeting..."
              minHeight="80px"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || createComment.isPending}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {createComment.isPending ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
