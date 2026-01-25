import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#6366f1', // indigo
];

interface Stage {
  id: string;
  name: string;
  color: string | null;
  probability: number | null;
  position: number;
}

interface StageItemProps {
  stage: Stage;
  index: number;
  onUpdate: (id: string, data: Partial<Stage>) => void;
  onDelete: (id: string) => void;
  dealsCount: number;
}

export function StageItem({ stage, index, onUpdate, onDelete, dealsCount }: StageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [editProbability, setEditProbability] = useState(stage.probability?.toString() || '0');

  const handleSave = () => {
    onUpdate(stage.id, {
      name: editName,
      probability: parseInt(editProbability) || 0,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(stage.name);
    setEditProbability(stage.probability?.toString() || '0');
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    onUpdate(stage.id, { color });
  };

  return (
    <Draggable draggableId={stage.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            flex items-center gap-3 p-3 rounded-lg border bg-card
            transition-all duration-200
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-sm'}
          `}
        >
          {/* Drag Handle */}
          <div
            {...provided.dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: stage.color || '#6366f1' }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`
                      w-7 h-7 rounded-full border-2 transition-transform hover:scale-110
                      ${stage.color === color ? 'border-foreground scale-110' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Name & Probability */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Nome da etapa"
                  autoFocus
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editProbability}
                    onChange={(e) => setEditProbability(e.target.value)}
                    className="h-8 w-16 text-sm text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-medium truncate">{stage.name}</span>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {stage.probability || 0}%
                </span>
                {dealsCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({dealsCount} negócio{dealsCount !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={dealsCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir etapa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a etapa "{stage.name}"?
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(stage.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
