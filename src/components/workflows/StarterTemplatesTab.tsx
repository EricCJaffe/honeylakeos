import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Settings2,
  Eye,
  ClipboardList,
  Users,
  BarChart3,
  BookOpen,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  allTemplates,
  templatesByCategory,
  categoryLabels,
  type StarterTemplate,
  type FormTemplate,
  type WorkflowTemplate,
  type TemplateCategory,
} from "@/data/workflowTemplates";

const categoryIcons: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  employee_lifecycle: Users,
  requests: ClipboardList,
  surveys: BarChart3,  knowledge_management: BookOpen,
};

const DISPLAY_CATEGORIES: TemplateCategory[] = [
  "employee_lifecycle",
  "requests",
  "surveys",
  "knowledge_management",
];

export function StarterTemplatesTab() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    let templates = activeCategory === "all" 
      ? allTemplates 
      : templatesByCategory[activeCategory] || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return templates;
  }, [activeCategory, searchQuery]);

  const formTemplates = filteredTemplates.filter((t): t is FormTemplate => t.type === "form");
  const workflowTemplates = filteredTemplates.filter((t): t is WorkflowTemplate => t.type === "workflow");

  const handlePreview = (template: StarterTemplate) => {
    if (template.type === "form") {
      // Navigate to the form preview/fill page
      navigate(`/app/forms/${template.id}`);
    }
  };

  const renderTemplateCard = (template: StarterTemplate) => {
    const isForm = template.type === "form";
    const Icon = isForm ? FileText : Settings2;
    const CategoryIcon = categoryIcons[template.category];

    return (
      <Card
        key={template.id}
        className="group hover:shadow-md transition-shadow"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <CardTitle className="text-base truncate">{template.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {categoryLabels[template.category].label}
                </Badge>
                <Badge variant={isForm ? "default" : "outline"} className="text-xs">
                  {isForm ? "Form" : "Workflow"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2">
            {template.summary || template.description}
          </CardDescription>

          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs py-0">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 4 && (
                <Badge variant="outline" className="text-xs py-0">
                  +{template.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isForm && (
              <Button
                size="sm"
                onClick={() => handlePreview(template)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                Fill Out
              </Button>
            )}
            {!isForm && (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="flex-1"
              >
                <Settings2 className="h-4 w-4 mr-1" />
                View Steps
              </Button>
            )}
          </div>

          {isForm && (
            <p className="text-xs text-muted-foreground text-center">
              {(template as FormTemplate).fields.length} field(s)
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">
            All
            <Badge variant="secondary" className="ml-1 text-xs">{allTemplates.length}</Badge>
          </TabsTrigger>
          {DISPLAY_CATEGORIES.map((cat) => {
            const CatIcon = categoryIcons[cat];
            const count = templatesByCategory[cat]?.length || 0;
            return (
              <TabsTrigger key={cat} value={cat} className="text-xs gap-1">
                <CatIcon className="h-3 w-3" />
                {categoryLabels[cat].label}
                <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Forms Section */}
              {formTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Form Templates ({formTemplates.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {formTemplates.map(renderTemplateCard)}
                  </div>
                </div>
              )}

              {/* Workflows Section */}
              {workflowTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Workflow Templates ({workflowTemplates.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workflowTemplates.map(renderTemplateCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
