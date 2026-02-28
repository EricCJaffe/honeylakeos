import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  History,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  User,
  Download,
  Loader2,
} from 'lucide-react';
import { useAuditLogViewer, useAuditEntityTypes } from '@/hooks/useAuditLogViewer';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const ACTION_PREFIX_PRESETS = [
  { label: "Exit Survey", value: "exit_survey." },
  { label: "Employee", value: "employee." },
  { label: "Integration", value: "integration." },
] as const;

function ActionBadge({ action }: { action: string }) {
  const getVariant = () => {
    if (action.includes('created') || action.includes('added')) return 'default';
    if (action.includes('deleted') || action.includes('removed') || action.includes('archived')) return 'destructive';
    if (action.includes('updated') || action.includes('changed')) return 'secondary';
    if (action.includes('restored')) return 'outline';
    return 'outline';
  };

  return (
    <Badge variant={getVariant()} className="font-mono text-xs">
      {action}
    </Badge>
  );
}

function EntityLink({ entityType, entityId }: { entityType: string; entityId: string | null }) {
  const navigate = useNavigate();

  if (!entityId) {
    return <span className="text-muted-foreground">-</span>;
  }

  const getEntityPath = (): string | null => {
    switch (entityType) {
      case 'task':
        return `/app/tasks/${entityId}`;
      case 'project':
        return `/app/projects/${entityId}`;
      case 'note':
        return `/app/notes/${entityId}`;
      case 'document':
        return `/app/documents/${entityId}`;
      case 'crm_client':
        return `/app/crm/${entityId}`;
      case 'event':
        return `/app/calendar/${entityId}`;
      case 'employee':
        return `/app/admin/employees`;
      default:
        return null;
    }
  };

  const path = getEntityPath();

  if (!path) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        {entityId.slice(0, 8)}...
      </span>
    );
  }

  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto p-0 font-mono text-xs"
      onClick={() => navigate(path)}
    >
      {entityId.slice(0, 8)}...
    </Button>
  );
}

export function AuditLogViewer() {
  const {
    logs,
    totalCount,
    isLoading,
    page,
    totalPages,
    setPage,
    filters,
    updateFilters,
    clearFilters,
  } = useAuditLogViewer();

  const { data: entityTypes } = useAuditEntityTypes();
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const actionTypes = useMemo(
    () => [...new Set(logs.map((log) => log.action))].sort(),
    [logs]
  );

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor'];
    const rows = logs.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.actor_email || 'System',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>
              View activity history for your organization
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search..."
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="h-9"
              />
            </div>

            <Select
              value={filters.entityType || 'all'}
              onValueChange={(v) => updateFilters({ entityType: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {entityTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.action || 'all'}
              onValueChange={(v) =>
                updateFilters({
                  action: v === 'all' ? undefined : v,
                  actionPrefix: undefined,
                })
              }
            >
              <SelectTrigger className="w-[240px] h-9">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {filters.startDate ? format(filters.startDate, 'MMM d') : 'Start'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => updateFilters({ startDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {filters.endDate ? format(filters.endDate, 'MMM d') : 'End'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => updateFilters({ endDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
        </div>

        {/* Prefix presets */}
        <div className="flex flex-wrap gap-2">
          {ACTION_PREFIX_PRESETS.map((preset) => {
            const active = filters.actionPrefix === preset.value;
            return (
              <Button
                key={preset.value}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilters({
                    actionPrefix: active ? undefined : preset.value,
                    action: undefined,
                  })
                }
              >
                {preset.label} ({preset.value}*)
              </Button>
            );
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
            {hasActiveFilters && (
              <p className="text-sm">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(new Date(log.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'h:mm:ss a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <EntityLink entityType={log.entity_type} entityId={log.entity_id} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {log.actor_email || 'System'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="rounded-md bg-muted/50 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Metadata</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                              {JSON.stringify(log.metadata ?? {}, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
