import { useState, Suspense, lazy } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RichTextField } from "@/components/ui/rich-text-field";
import { useTaskComments, useTaskCommentMutations } from "@/hooks/useTaskComments";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";

// Lazy load rich text display
const RichTextDisplay = lazy(() => 
  import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay }))
);

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const { createComment, deleteComment } = useTaskCommentMutations(taskId);
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createComment.mutateAsync(newComment);
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    await deleteComment.mutateAsync(commentId);
  };

  const canDeleteComment = (authorId: string) => {
    return isCompanyAdmin || authorId === user?.id;
  };

  const getInitials = (userId: string) => {
    // Simple fallback - first 2 chars of ID
    return userId.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.author_user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {canDeleteComment(comment.author_user_id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 text-sm bg-muted/50 rounded-lg p-3">
                    <Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded" />}>
                      <RichTextDisplay content={comment.body_rte} className="text-sm" />
                    </Suspense>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Comment Input */}
        <div className="border-t pt-4">
          <RichTextField
            label=""
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment..."
            minHeight="80px"
          />
          <div className="flex justify-end mt-2">
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
