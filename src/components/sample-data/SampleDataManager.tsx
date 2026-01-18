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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FlaskConical, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useSampleData, SampleBatchType } from '@/hooks/useSampleData';
import { format } from 'date-fns';

const BATCH_TYPE_LABELS: Record<SampleBatchType, string> = {
  business: 'Business',
  nonprofit: 'Nonprofit',
  church: 'Church',
};

const BATCH_TYPE_DESCRIPTIONS: Record<SampleBatchType, string> = {
  business: 'Tasks, projects, CRM clients, opportunities, and invoices',
  nonprofit: 'Donors, donations, campaigns, receipts, and projects',
  church: 'Members, giving records, LMS courses, and pastoral notes',
};

export function SampleDataManager() {
  const {
    hasSampleData,
    activeBatch,
    isLoading,
    createSampleData,
    isCreating,
    removeSampleData,
    isRemoving,
  } = useSampleData();

  const [selectedType, setSelectedType] = useState<SampleBatchType>('business');
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);

  const handleCreate = () => {
    createSampleData(selectedType);
    setShowConfirmCreate(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Sample Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Sample Data
        </CardTitle>
        <CardDescription>
          Create sample data to explore features without affecting real records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSampleData && activeBatch ? (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Sample data is active</AlertTitle>
              <AlertDescription>
                {BATCH_TYPE_LABELS[activeBatch.batch_type as SampleBatchType]} sample data was created on{' '}
                {format(new Date(activeBatch.created_at), 'MMM d, yyyy')}. 
                Sample records are labeled with a "Sample" badge.
              </AlertDescription>
            </Alert>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isRemoving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isRemoving ? 'Removing...' : 'Remove Sample Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove all sample data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all sample records. This action cannot be undone.
                    Your real data will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeSampleData()}>
                    Remove Sample Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-400">About sample data</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Sample data is clearly labeled and can be removed at any time. 
                It will not appear in reports or analytics by default.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select data type</label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as SampleBatchType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BATCH_TYPE_LABELS) as SampleBatchType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        <div>
                          <div className="font-medium">{BATCH_TYPE_LABELS[type]}</div>
                          <div className="text-xs text-muted-foreground">
                            {BATCH_TYPE_DESCRIPTIONS[type]}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialog open={showConfirmCreate} onOpenChange={setShowConfirmCreate}>
                <AlertDialogTrigger asChild>
                  <Button disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? 'Creating...' : 'Add Sample Data'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Create {BATCH_TYPE_LABELS[selectedType]} sample data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create sample records including: {BATCH_TYPE_DESCRIPTIONS[selectedType]}.
                      <br /><br />
                      Sample data is clearly labeled and can be removed at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreate}>
                      Create Sample Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
