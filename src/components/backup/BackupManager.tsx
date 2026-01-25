import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HardDrive,
  Plus,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useCompanyBackups, CompanyBackup } from '@/hooks/useCompanyBackups';
import { format, formatDistanceToNow } from 'date-fns';

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function BackupStatusBadge({ status }: { status: CompanyBackup['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          In Progress
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function RestoreDialog({
  backup,
  onRestore,
  isRestoring,
}: {
  backup: CompanyBackup;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);

  const handleRestore = () => {
    if (confirmText === 'RESTORE') {
      onRestore();
      setOpen(false);
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={backup.status !== 'completed' || isRestoring}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Restore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Restore from Backup
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              You are about to restore data from the backup created on{' '}
              <strong>{format(new Date(backup.created_at), 'MMM d, yyyy h:mm a')}</strong>.
            </div>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will <strong>replace all current data</strong> with the backup data.
                This action cannot be undone. Consider creating a backup first.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              Backup contains: {backup.metadata_json?.total_records ?? 0} records
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">
                Type <strong>RESTORE</strong> to confirm:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={confirmText !== 'RESTORE' || isRestoring}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              'Restore Backup'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BackupManager() {
  const {
    backups,
    stats,
    isLoading,
    canCreateBackup,
    createBackup,
    isCreatingBackup,
    restoreBackup,
    isRestoring,
  } = useCompanyBackups();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Data Backups
            </CardTitle>
            <CardDescription>
              Create and restore backups of your organization data
            </CardDescription>
          </div>
          <Button
            onClick={() => createBackup()}
            disabled={!canCreateBackup || isCreatingBackup}
          >
            {isCreatingBackup ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Backup
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        {stats && stats.last_successful_backup && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Last successful backup</AlertTitle>
            <AlertDescription>
              {formatDistanceToNow(new Date(stats.last_successful_backup), { addSuffix: true })}
              {' · '}
              {stats.last_backup_type === 'manual' ? 'Manual backup' : 'Scheduled backup'}
            </AlertDescription>
          </Alert>
        )}

        {!canCreateBackup && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Rate limit</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Manual backups are limited to one per hour. Please wait before creating another backup.
            </AlertDescription>
          </Alert>
        )}

        {/* Backup List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No backups yet</p>
            <p className="text-sm">Create your first backup to protect your data</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Records</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {format(new Date(backup.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(backup.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {backup.backup_type === 'manual' ? 'Manual' : 'Scheduled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <BackupStatusBadge status={backup.status} />
                  </TableCell>
                  <TableCell>{formatBytes(backup.file_size_bytes)}</TableCell>
                  <TableCell>{backup.metadata_json?.total_records ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <RestoreDialog
                      backup={backup}
                      onRestore={() => restoreBackup(backup.id)}
                      isRestoring={isRestoring}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
