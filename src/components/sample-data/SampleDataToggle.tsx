import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FlaskConical } from 'lucide-react';

interface SampleDataToggleProps {
  showSampleData: boolean;
  onToggle: (show: boolean) => void;
  className?: string;
}

export function SampleDataToggle({ showSampleData, onToggle, className }: SampleDataToggleProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch
        id="show-sample"
        checked={showSampleData}
        onCheckedChange={onToggle}
      />
      <Label htmlFor="show-sample" className="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer">
        <FlaskConical className="h-3.5 w-3.5" />
        Show sample data
      </Label>
    </div>
  );
}
