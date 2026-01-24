import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ThumbsUp, ThumbsDown, Tag, Clock, User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbArticle, useKbArticleMutations, useKbArticles } from "@/hooks/useSupportCenter";
import { format } from "date-fns";

// Lazy load rich text display for consistent rendering
const RichTextDisplay = React.lazy(() => 
  import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay }))
);
export default function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading } = useKbArticle(articleId);
  const { markHelpful } = useKbArticleMutations();
  const [hasVoted, setHasVoted] = React.useState(false);

  // Get related articles by tags
  const { data: allArticles } = useKbArticles({ status: "published" });
  const relatedArticles = allArticles
    ?.filter(
      (a) =>
        a.id !== articleId &&
        article?.tags?.some((tag) => a.tags?.includes(tag))
    )
    .slice(0, 3);

  const handleHelpful = (helpful: boolean) => {
    if (hasVoted || !articleId) return;
    markHelpful.mutate({ id: articleId, helpful });
    setHasVoted(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Article not found</p>
        <Button variant="link" onClick={() => navigate("/app/support/kb")}>
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/support/kb")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Knowledge Base
      </Button>

      <PageHeader
        title={article.title}
        description={article.category?.name || "Uncategorized"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="pt-6">
              {/* Article metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
                {article.published_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Published {format(new Date(article.published_at), "MMM d, yyyy")}</span>
                  </div>
                )}
                {article.category && (
                  <Badge variant="secondary">{article.category.name}</Badge>
                )}
              </div>

              {/* Article body */}
              <React.Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <RichTextDisplay content={article.body_rich_text} />
              </React.Suspense>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-8 pt-6 border-t">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Helpful feedback */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-6">
                <span className="text-sm text-muted-foreground">Was this article helpful?</span>
                <div className="flex gap-2">
                  <Button
                    variant={hasVoted ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleHelpful(true)}
                    disabled={hasVoted}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Yes ({article.helpful_yes_count})
                  </Button>
                  <Button
                    variant={hasVoted ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleHelpful(false)}
                    disabled={hasVoted}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    No ({article.helpful_no_count})
                  </Button>
                </div>
              </div>
              {hasVoted && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Thank you for your feedback!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Related Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/app/support/kb/${related.id}`}
                    className="block text-sm hover:text-primary transition-colors"
                  >
                    {related.title}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Still need help? */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Still need help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? Submit a support ticket and our team will help you.
              </p>
              <Button
                className="w-full"
                onClick={() => navigate("/app/support/tickets/new")}
              >
                Submit a Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
