import * as React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useResolvedForm, useEngagementResolvedForm, type ResolvedForm } from "@/hooks/useFormResolver";

interface FormLauncherProps {
  /** Base form key (without program prefix) */
  baseKey: string;
  /** Optional engagement context for resolution */
  engagementId?: string | null;
  /** Optional coaching org context (overrides active org) */
  coachingOrgId?: string | null;
  /** Callback when form is launched */
  onLaunch?: (form: ResolvedForm) => void;
  /** Show as inline button or card */
  variant?: "button" | "card";
  /** Custom button label */
  buttonLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FormLauncher - Resolves and launches a form by base key
 * 
 * Uses program pack resolution to find the correct form variant:
 * 1. {program_key}_{base_key}
 * 2. generic_{base_key} (fallback)
 */
export function FormLauncher({
  baseKey,
  engagementId,
  coachingOrgId,
  onLaunch,
  variant = "button",
  buttonLabel,
  className,
}: FormLauncherProps) {
  const navigate = useNavigate();

  // Use engagement-scoped resolution if engagement is provided
  const engagementResolver = useEngagementResolvedForm(
    engagementId ? baseKey : null,
    engagementId || null
  );
  
  // Otherwise use org-scoped resolution
  const orgResolver = useResolvedForm(
    !engagementId ? baseKey : null,
    coachingOrgId
  );

  const { form, isLoading, error } = engagementId ? engagementResolver : orgResolver;

  const handleLaunch = () => {
    if (!form) return;
    
    if (onLaunch) {
      onLaunch(form);
    } else {
      // Default navigation to form page
      navigate(`/app/forms/${form.templateKey || form.baseKey}`);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading form...
      </Button>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load form: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!form) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Form not found: {baseKey}</AlertDescription>
      </Alert>
    );
  }

  if (variant === "card") {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{form.title}</CardTitle>
            <div className="flex items-center gap-1">
              {form.isDefault && (
                <Badge variant="secondary" className="text-xs">Fallback</Badge>
              )}
              <Badge variant="outline" className="text-xs">{form.resolvedFromPack}</Badge>
            </div>
          </div>
          {form.description && (
            <CardDescription className="text-sm">{form.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <Button onClick={handleLaunch} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            {buttonLabel || "Open Form"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button onClick={handleLaunch} variant="outline" className={className}>
      <FileText className="h-4 w-4 mr-2" />
      {buttonLabel || form.title}
      {form.isDefault && (
        <Badge variant="secondary" className="ml-2 text-xs">Generic</Badge>
      )}
    </Button>
  );
}

interface FormPreviewProps {
  /** Base form key */
  baseKey: string;
  /** Optional engagement context */
  engagementId?: string | null;
  /** Optional coaching org context */
  coachingOrgId?: string | null;
}

/**
 * FormPreview - Shows form metadata with resolution info
 */
export function FormPreview({ baseKey, engagementId, coachingOrgId }: FormPreviewProps) {
  const engagementResolver = useEngagementResolvedForm(
    engagementId ? baseKey : null,
    engagementId || null
  );
  const orgResolver = useResolvedForm(
    !engagementId ? baseKey : null,
    coachingOrgId
  );

  const { form, isLoading, error } = engagementId ? engagementResolver : orgResolver;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Resolving form...</span>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Form not found: {baseKey}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{form.title}</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs">{form.resolvedFromPack}</Badge>
        {form.isDefault && (
          <Badge variant="secondary" className="text-xs">Fallback</Badge>
        )}
      </div>
    </div>
  );
}

interface ResolvedFormLinkProps {
  /** Base form key */
  baseKey: string;
  /** Engagement context for resolution */
  engagementId?: string | null;
  /** Coaching org context */
  coachingOrgId?: string | null;
  /** Link text (defaults to form title) */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ResolvedFormLink - Renders a link to a resolved form
 */
export function ResolvedFormLink({
  baseKey,
  engagementId,
  coachingOrgId,
  children,
  className,
}: ResolvedFormLinkProps) {
  const navigate = useNavigate();
  const engagementResolver = useEngagementResolvedForm(
    engagementId ? baseKey : null,
    engagementId || null
  );
  const orgResolver = useResolvedForm(
    !engagementId ? baseKey : null,
    coachingOrgId
  );

  const { form, isLoading } = engagementId ? engagementResolver : orgResolver;

  if (isLoading || !form) return null;

  const handleClick = () => {
    navigate(`/app/forms/${form.templateKey || form.baseKey}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-primary hover:underline ${className}`}
    >
      {children || form.title}
      <ExternalLink className="h-3 w-3" />
    </button>
  );
}
