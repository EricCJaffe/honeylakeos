import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';

interface SampleBadgeProps {
  className?: string;
}

export function SampleBadge({ className }: SampleBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-normal text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 ${className}`}
    >
      <FlaskConical className="h-3 w-3 mr-1" />
      Sample
    </Badge>
  );
}
