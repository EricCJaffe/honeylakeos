import { useMembership } from "@/lib/membership";
import { useDepartments } from "@/hooks/useDepartments";
import { useUserDepartmentMembership } from "@/hooks/useUserDepartmentMembership";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface DepartmentSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** If true, shows "Personal" option as creator-only visibility */
  showPersonalOption?: boolean;
  /** If true, shows "Company-wide" option */
  showCompanyWideOption?: boolean;
}

export function DepartmentSelect({
  value,
  onChange,
  label = "Department",
  placeholder = "Select department",
  className,
  disabled,
  showPersonalOption = false,
  showCompanyWideOption = true,
}: DepartmentSelectProps) {
  const { isCompanyAdmin } = useMembership();
  const { data: allDepartments, isLoading: allLoading } = useDepartments();
  const { data: userMemberships, isLoading: membershipLoading } = useUserDepartmentMembership();

  const isLoading = allLoading || membershipLoading;

  // Company admins can see all departments, regular users only their own
  const departments = isCompanyAdmin
    ? allDepartments
    : userMemberships?.map((m) => m.department) || [];

  const handleChange = (val: string) => {
    if (val === "__none__" || val === "__company_wide__") {
      onChange(null);
    } else if (val === "__personal__") {
      // Personal is handled by the calling component - typically means visible to creator only
      onChange("__personal__");
    } else {
      onChange(val);
    }
  };

  // Determine display value
  const displayValue = value === "__personal__" 
    ? "__personal__" 
    : value || "__none__";

  return (
    <div className={className}>
      {label && (
        <Label className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {label}
        </Label>
      )}
      <Select
        value={displayValue}
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showCompanyWideOption && (
            <SelectItem value="__none__">
              <span className="text-muted-foreground">Company-wide (no department)</span>
            </SelectItem>
          )}
          {showPersonalOption && (
            <SelectItem value="__personal__">
              <span className="text-muted-foreground">Personal (only me)</span>
            </SelectItem>
          )}
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Uncontrolled version using React Hook Form
 */
export function DepartmentSelectField({
  control,
  name = "department_id",
  ...props
}: Omit<DepartmentSelectProps, "value" | "onChange"> & {
  control: any;
  name?: string;
}) {
  // This is a placeholder - implement with react-hook-form's Controller if needed
  return null;
}
