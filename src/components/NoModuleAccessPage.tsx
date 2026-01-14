import * as React from "react";
import { ShieldX, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface NoModuleAccessPageProps {
  moduleName: string;
  reason: "not_enabled" | "no_permission";
}

export function NoModuleAccessPage({ moduleName, reason }: NoModuleAccessPageProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="py-12 text-center">
            {reason === "not_enabled" ? (
              <>
                <Lock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Module Not Enabled
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                  The <strong>{moduleName}</strong> module is not enabled for your company.
                  Contact your administrator to request access.
                </p>
              </>
            ) : (
              <>
                <ShieldX className="h-12 w-12 text-destructive/40 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Access Denied
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                  You don't have permission to access the <strong>{moduleName}</strong> module.
                  Contact your administrator if you believe this is an error.
                </p>
              </>
            )}
            <Button variant="outline" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
