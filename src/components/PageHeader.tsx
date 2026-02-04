import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  onBack,
  actionLabel,
  onAction,
  showAction = true,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {onBack && !backHref && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && showAction && (
          <Button onClick={onAction} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
