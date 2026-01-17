import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  FileText,
  Pencil,
  Trash2,
  Eye,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useKbCategories,
  useKbCategoryMutations,
  useKbArticles,
  useKbArticleMutations,
  useSiteId,
} from "@/hooks/useSupportCenter";
import { useMembership } from "@/lib/membership";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type KbArticleStatus = Database["public"]["Enums"]["kb_article_status"];

const STATUS_VARIANTS: Record<KbArticleStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export default function KbAdminPage() {
  const navigate = useNavigate();
  const { isSiteAdmin } = useMembership();
  const { data: siteId } = useSiteId();

  const { data: categories, isLoading: categoriesLoading } = useKbCategories();
  const { createCategory, updateCategory, archiveCategory } = useKbCategoryMutations();
  const { data: articles, isLoading: articlesLoading } = useKbArticles();
  const { createArticle, publishArticle, archiveArticle } = useKbArticleMutations();

  const [activeTab, setActiveTab] = useState("articles");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "category" | "article"; id: string } | null>(null);

  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newArticle, setNewArticle] = useState({
    title: "",
    body_rich_text: "",
    category_id: "",
    tags: "",
  });

  const handleCreateCategory = async () => {
    if (!siteId || !newCategory.name) return;
    await createCategory.mutateAsync({
      site_id: siteId,
      name: newCategory.name,
      description: newCategory.description,
    });
    setCategoryDialogOpen(false);
    setNewCategory({ name: "", description: "" });
  };

  const handleCreateArticle = async () => {
    if (!siteId || !newArticle.title) return;
    await createArticle.mutateAsync({
      site_id: siteId,
      title: newArticle.title,
      body_rich_text: newArticle.body_rich_text,
      category_id: newArticle.category_id || undefined,
      tags: newArticle.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setArticleDialogOpen(false);
    setNewArticle({ title: "", body_rich_text: "", category_id: "", tags: "" });
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "category") {
      await archiveCategory.mutateAsync(itemToDelete.id);
    } else {
      await archiveArticle.mutateAsync(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  if (!isSiteAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You don't have permission to manage the knowledge base.
        </p>
        <Button variant="link" onClick={() => navigate("/app/support/kb")}>
          Go to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base Admin"
        description="Manage categories, articles, and documentation"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {articles?.length || 0} articles
            </div>
            <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Article</DialogTitle>
                  <DialogDescription>
                    Create a new knowledge base article
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newArticle.title}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, title: e.target.value })
                      }
                      placeholder="Article title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newArticle.category_id}
                      onValueChange={(v) =>
                        setNewArticle({ ...newArticle, category_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Content</Label>
                    <Textarea
                      id="body"
                      value={newArticle.body_rich_text}
                      onChange={(e) =>
                        setNewArticle({
                          ...newArticle,
                          body_rich_text: e.target.value,
                        })
                      }
                      placeholder="Article content (HTML supported)"
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={newArticle.tags}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, tags: e.target.value })
                      }
                      placeholder="getting-started, setup, basics"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setArticleDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateArticle}
                    disabled={!newArticle.title || createArticle.isPending}
                  >
                    Create Article
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {articlesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : articles && articles.length > 0 ? (
            <div className="space-y-2">
              {articles.map((article) => (
                <Card key={article.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{article.title}</p>
                          <Badge variant={STATUS_VARIANTS[article.status]}>
                            {article.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {article.category?.name || "Uncategorized"} •
                          Updated {format(new Date(article.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {article.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishArticle.mutate(article.id)}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/app/support/kb/${article.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setItemToDelete({ type: "article", id: article.id });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No articles yet</p>
                <p className="text-sm">Create your first knowledge base article.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {categories?.length || 0} categories
            </div>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Category</DialogTitle>
                  <DialogDescription>
                    Create a new knowledge base category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newCategory.name}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, name: e.target.value })
                      }
                      placeholder="Category name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCategory.description}
                      onChange={(e) =>
                        setNewCategory({
                          ...newCategory,
                          description: e.target.value,
                        })
                      }
                      placeholder="Brief description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCategoryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategory.name || createCategory.isPending}
                  >
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {categoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setItemToDelete({ type: "category", id: category.id });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No categories yet</p>
                <p className="text-sm">Create categories to organize your articles.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the {itemToDelete?.type}. It can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
