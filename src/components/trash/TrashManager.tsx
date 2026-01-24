import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Trash2,
  RotateCcw,
  Loader2,
  FileText,
  FolderKanban,
  StickyNote,
  File,
  Users,
  Calendar,
  Receipt,
  Heart,
} from 'lucide-react';
import { useSoftDelete, TrashItem, TrashEntityType } from '@/hooks/useSoftDelete';
import { format, formatDistanceToNow, addDays, isBefore } from 'date-fns';

const ENTITY_CONFIG: Record<TrashEntityType, { label: string; icon: React.ElementType }> = {
  tasks: { label: 'Tasks', icon: FileText },
  projects: { label: 'Projects', icon: FolderKanban },
  notes: { label: 'Notes', icon: StickyNote },
  documents: { label: 'Documents', icon: File },
  crm_clients: { label: 'CRM Clients', icon: Users },
  external_contacts: { label: 'Contacts', icon: Users },
  events: { label: 'Events', icon: Calendar },
  invoices: { label: 'Invoices', icon: Receipt },
  donations: { label: 'Donations', icon: Heart },
};

const RECOVERY_WINDOW_DAYS = 30;

function TrashItemRow({
  item,
  onRestore,
  isRestoring,
}: {
  item: TrashItem;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const deletedDate = new Date(item.deleted_at);
  const expiresDate = addDays(deletedDate, RECOVERY_WINDOW_DAYS);
  const isExpiringSoon = isBefore(expiresDate, addDays(new Date(), 7));

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            Deleted {formatDistanceToNow(deletedDate, { addSuffix: true })}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {format(deletedDate, 'MMM d, yyyy h:mm a')}
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant={isExpiringSoon ? 'destructive' : 'outline'}
          className="text-xs"
        >
          {format(expiresDate, 'MMM d, yyyy')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isRestoring}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restore
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore "{item.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the item to its original location. 
                If the parent folder or project no longer exists, it will be restored as unfiled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRestore}>
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

function TrashTabContent({
  entityType,
  getTrashItems,
  restore,
  isRestoring,
}: {
  entityType: TrashEntityType;
  getTrashItems: (type: TrashEntityType) => Promise<TrashItem[]>;
  restore: (params: { entityType: TrashEntityType; entityId: string }) => void;
  isRestoring: boolean;
}) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getTrashItems(entityType)
      .then(setItems)
      .finally(() => setIsLoading(false));
  }, [entityType, getTrashItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    const config = ENTITY_CONFIG[entityType];
    const Icon = config.icon;
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No deleted {config.label.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Deleted</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TrashItemRow
            key={item.id}
            item={item}
            onRestore={() => restore({ entityType, entityId: item.id })}
            isRestoring={isRestoring}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export function TrashManager() {
  const {
    trashCounts,
    totalTrashCount,
    isLoadingCounts,
    getTrashItems,
    restore,
    isRestoring,
  } = useSoftDelete();

  const entityTypes = Object.keys(ENTITY_CONFIG) as TrashEntityType[];
  const [activeTab, setActiveTab] = useState<TrashEntityType>('tasks');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Trash
          {totalTrashCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalTrashCount}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Deleted items are kept for {RECOVERY_WINDOW_DAYS} days before permanent deletion
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingCounts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalTrashCount === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Trash is empty</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TrashEntityType)}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {entityTypes.map((type) => {
                const config = ENTITY_CONFIG[type];
                const count = trashCounts[type.replace('s$', '')] || trashCounts[type] || 0;
                if (count === 0) return null;
                
                return (
                  <TabsTrigger key={type} value={type} className="gap-1">
                    {config.label}
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {entityTypes.map((type) => (
              <TabsContent key={type} value={type}>
                <TrashTabContent
                  entityType={type}
                  getTrashItems={getTrashItems}
                  restore={restore}
                  isRestoring={isRestoring}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
