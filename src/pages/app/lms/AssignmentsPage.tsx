import * as React from "react";
import { motion } from "framer-motion";
import { ClipboardList, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

export default function AssignmentsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="Assignments" 
        description="Assign learning content to users, groups, and departments"
        icon={ClipboardList}
      />

      <Card className="border-border border-dashed">
        <CardContent className="py-12 text-center">
          <Construction className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Assignments allow you to assign learning paths, courses, or lessons to specific users, groups, or departments. This feature is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
