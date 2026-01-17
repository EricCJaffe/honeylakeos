import * as React from "react";
import { Folder } from "lucide-react";
import { FolderPicker } from "./FolderPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  itemType: "document" | "note";
  currentFolderId?: string | null;
  onMove: (folderId: string | null) => void;
  isMoving?: boolean;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  itemCount,
  itemType,
  currentFolderId,
  onMove,
  isMoving = false,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(currentFolderId ?? null);

  React.useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId ?? null);
    }
  }, [open, currentFolderId]);

  const handleMove = () => {
    onMove(selectedFolderId);
  };

  const itemLabel = itemCount === 1 ? itemType : `${itemType}s`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Move to Folder
          </DialogTitle>
          <DialogDescription>
            {itemCount === 1
              ? `Choose a folder for this ${itemType}.`
              : `Move ${itemCount} ${itemLabel} to a folder.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <FolderPicker
            value={selectedFolderId}
            onChange={setSelectedFolderId}
            placeholder="Select destination folder"
            allowClear={false}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
