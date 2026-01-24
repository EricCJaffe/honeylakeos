import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  /** Number of skeleton rows to render */
  count?: number;
  /** Variant of the skeleton */
  variant?: "default" | "card" | "table" | "compact";
  /** Additional class names */
  className?: string;
}

/**
 * Reusable skeleton loader for list views.
 * Provides consistent loading states across the app.
 */
export function ListSkeleton({
  count = 5,
  variant = "default",
  className,
}: ListSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Table header skeleton */}
        <div className="flex items-center gap-4 py-3 px-4 border-b">
          <Skeleton className="h-4 w-[25%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[15%]" />
          <Skeleton className="h-4 w-[15%]" />
          <Skeleton className="h-4 w-[10%] ml-auto" />
        </div>
        {/* Table rows */}
        {items.map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 px-4">
            <Skeleton className="h-4 w-[25%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-8 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {items.map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[70%]" />
                  <Skeleton className="h-3 w-[50%]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-3 w-[40%]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DetailSkeletonProps {
  /** Show sidebar placeholder */
  hasSidebar?: boolean;
  className?: string;
}

/**
 * Skeleton for detail/edit pages with consistent layout.
 */
export function DetailSkeleton({ hasSidebar = true, className }: DetailSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className={cn("grid gap-6", hasSidebar && "lg:grid-cols-3")}>
        {/* Main content */}
        <div className={cn("space-y-4", hasSidebar && "lg:col-span-2")}>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[75%]" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        {hasSidebar && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

interface FormSkeletonProps {
  /** Number of form fields */
  fieldCount?: number;
  className?: string;
}

/**
 * Skeleton for form dialogs/pages.
 */
export function FormSkeleton({ fieldCount = 4, className }: FormSkeletonProps) {
  const fields = Array.from({ length: fieldCount }, (_, i) => i);

  return (
    <div className={cn("space-y-4", className)}>
      {fields.map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
