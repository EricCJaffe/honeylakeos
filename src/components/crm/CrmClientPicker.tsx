import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, X, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CrmClientPickerProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
}

interface CrmClientOption {
  id: string;
  entity_kind: "person" | "organization";
  person_full_name: string | null;
  org_name: string | null;
  person_email: string | null;
  org_email: string | null;
  lifecycle_status: string;
}

export function CrmClientPicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Link to client...",
  className,
  showClear = true,
}: CrmClientPickerProps) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const [open, setOpen] = React.useState(false);

  const moduleEnabled = !modulesLoading && isEnabled("crm");

  const { data: clients = [] } = useQuery({
    queryKey: ["crm-clients-picker", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("crm_clients")
        .select("id, entity_kind, person_full_name, org_name, person_email, org_email, lifecycle_status")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CrmClientOption[];
    },
    enabled: !!activeCompanyId && moduleEnabled,
  });

  if (!moduleEnabled && !modulesLoading) {
    return null;
  }

  const selectedClient = clients.find((c) => c.id === value);

  const getClientName = (client: CrmClientOption) => {
    return client.entity_kind === "organization"
      ? client.org_name || "Unnamed Organization"
      : client.person_full_name || "Unnamed Person";
  };

  const getClientSubtitle = (client: CrmClientOption) => {
    return client.entity_kind === "organization"
      ? client.org_email
      : client.person_email;
  };

  const ClientIcon = ({ client }: { client: CrmClientOption }) => {
    return client.entity_kind === "organization" ? (
      <Building2 className="h-4 w-4 shrink-0 opacity-70" />
    ) : (
      <User className="h-4 w-4 shrink-0 opacity-70" />
    );
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal flex-1",
              !value && "text-muted-foreground"
            )}
          >
            {selectedClient ? (
              <>
                <ClientIcon client={selectedClient} />
                <span className="ml-2 truncate">{getClientName(selectedClient)}</span>
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <span>{placeholder}</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${getClientName(client)} ${getClientSubtitle(client) || ""}`}
                    onSelect={() => {
                      onChange(client.id);
                      setOpen(false);
                    }}
                  >
                    <ClientIcon client={client} />
                    <div className="ml-2 flex flex-col flex-1 min-w-0">
                      <span className="truncate">{getClientName(client)}</span>
                      {getClientSubtitle(client) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {getClientSubtitle(client)}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] px-1.5 shrink-0"
                    >
                      {client.lifecycle_status}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showClear && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
