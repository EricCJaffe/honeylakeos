import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Check, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export function CompanySwitcher() {
  const navigate = useNavigate();
  const { memberships, activeCompany, activeCompanyId, setActiveCompany, loading } = useMembership();
  const [switching, setSwitching] = React.useState(false);

  const handleSwitch = async (companyId: string) => {
    if (companyId === activeCompanyId) return;
    
    setSwitching(true);
    try {
      await setActiveCompany(companyId);
      toast.success("Switched company");
    } catch (error) {
      toast.error("Failed to switch company");
    } finally {
      setSwitching(false);
    }
  };

  if (loading || memberships.length === 0) {
    return null;
  }

  // Only show if user has multiple memberships
  if (memberships.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
          {activeCompany?.name || "No Company"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-3"
          disabled={switching}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {activeCompany?.name || "Select Company"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch Company
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => handleSwitch(membership.company_id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              {membership.company.logo_url ? (
                <img
                  src={membership.company.logo_url}
                  alt={membership.company.name}
                  className="w-5 h-5 object-contain"
                />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{membership.company.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {membership.role.replace("_", " ")}
              </p>
            </div>
            {membership.company_id === activeCompanyId && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/app/select-company")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>View all companies</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
