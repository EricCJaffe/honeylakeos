import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, ChevronRight, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbCategories, useKbArticles, useSearchKbArticles } from "@/hooks/useSupportCenter";

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useKbCategories();
  const { data: articles, isLoading: articlesLoading } = useKbArticles({
    categoryId: selectedCategoryId || undefined,
    status: "published",
  });
  const { data: searchResults } = useSearchKbArticles(searchQuery);

  const displayArticles = searchQuery.length >= 2 ? searchResults : articles;
  const isLoading = categoriesLoading || articlesLoading;

  const getExcerpt = (body: string | null, maxLength = 150) => {
    if (!body) return "";
    const text = body.replace(/<[^>]*>/g, "");
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Find answers to common questions and learn how to use the platform"
      />

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">
            Categories
          </h3>
          {categoriesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  selectedCategoryId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                All Articles
              </button>
              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedCategoryId === category.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Articles */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : displayArticles && displayArticles.length > 0 ? (
            displayArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/app/support/kb/${article.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {article.title}
                      </CardTitle>
                      {article.category && (
                        <Badge variant="secondary" className="text-xs">
                          {article.category.name}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {getExcerpt(article.body_rich_text)}
                  </CardDescription>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No articles found</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Check back later for helpful documentation"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
