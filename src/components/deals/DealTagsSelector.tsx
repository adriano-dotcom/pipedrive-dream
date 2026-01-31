import { useState, useMemo } from 'react';
import { Check, Plus, Tags, Loader2, Settings, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { TagBadge } from '@/components/shared/TagBadge';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { 
  useDealTags, 
  useCreateDealTag,
  useUpdateDealTag,
  useDeleteDealTag,
  TAG_COLORS,
  type DealTag 
} from '@/hooks/useDealTags';
import { toast } from 'sonner';

interface DealTagsSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

type ViewMode = 'select' | 'create' | 'manage' | 'edit';

export function DealTagsSelector({ 
  selectedTagIds, 
  onTagsChange,
  className 
}: DealTagsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[4].value);
  const [searchValue, setSearchValue] = useState('');
  const [editingTag, setEditingTag] = useState<DealTag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [tagToDelete, setTagToDelete] = useState<DealTag | null>(null);
  
  const { data: allTags = [], isLoading } = useDealTags();
  const createTagMutation = useCreateDealTag();
  const updateTagMutation = useUpdateDealTag();
  const deleteTagMutation = useDeleteDealTag();
  
  const selectedTags = useMemo(() => {
    return allTags.filter(tag => selectedTagIds.includes(tag.id));
  }, [allTags, selectedTagIds]);
  
  const filteredTags = useMemo(() => {
    if (!searchValue) return allTags;
    return allTags.filter(tag => 
      tag.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [allTags, searchValue]);
  
  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };
  
  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };
  
  const resetCreateForm = () => {
    setNewTagName('');
    setNewTagColor(TAG_COLORS[4].value);
    setViewMode('select');
  };
  
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Digite um nome para a etiqueta');
      return;
    }
    
    const exists = allTags.some(
      tag => tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    
    if (exists) {
      toast.error('Já existe uma etiqueta com esse nome');
      return;
    }
    
    try {
      const newTag = await createTagMutation.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
      });
      
      onTagsChange([...selectedTagIds, newTag.id]);
      resetCreateForm();
      toast.success('Etiqueta criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar etiqueta');
    }
  };
  
  const handleStartEdit = (tag: DealTag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
    setViewMode('edit');
  };
  
  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditName('');
    setEditColor('');
    setViewMode('manage');
  };
  
  const handleSaveEdit = async () => {
    if (!editingTag || !editName.trim()) {
      toast.error('Digite um nome para a etiqueta');
      return;
    }
    
    const exists = allTags.some(
      tag => tag.id !== editingTag.id && tag.name.toLowerCase() === editName.trim().toLowerCase()
    );
    
    if (exists) {
      toast.error('Já existe uma etiqueta com esse nome');
      return;
    }
    
    try {
      await updateTagMutation.mutateAsync({
        id: editingTag.id,
        name: editName.trim(),
        color: editColor,
      });
      
      handleCancelEdit();
      toast.success('Etiqueta atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar etiqueta. Verifique suas permissões.');
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    
    try {
      await deleteTagMutation.mutateAsync(tagToDelete.id);
      onTagsChange(selectedTagIds.filter(id => id !== tagToDelete.id));
      setTagToDelete(null);
      toast.success('Etiqueta excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir etiqueta. Verifique suas permissões.');
    }
  };

  const renderSelectView = () => (
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Buscar etiqueta..." 
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          </div>
        ) : filteredTags.length === 0 ? (
          <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
        ) : (
          <CommandGroup>
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <CommandItem
                  key={tag.id}
                  value={tag.id}
                  onSelect={() => handleToggleTag(tag.id)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <TagBadge name={tag.name} color={tag.color} />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        
        <CommandSeparator />
        
        <CommandGroup>
          <CommandItem
            onSelect={() => setViewMode('create')}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar nova etiqueta
          </CommandItem>
          <CommandItem
            onSelect={() => setViewMode('manage')}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar etiquetas
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const renderCreateView = () => (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Nova Etiqueta</span>
        <Button variant="ghost" size="sm" onClick={resetCreateForm}>
          Cancelar
        </Button>
      </div>
      
      <div className="space-y-2">
        <Input
          placeholder="Nome da etiqueta"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateTag();
            }
          }}
        />
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setNewTagColor(color.value)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  newTagColor === color.value
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
        
        <Button
          onClick={handleCreateTag}
          disabled={createTagMutation.isPending || !newTagName.trim()}
          className="w-full"
          size="sm"
        >
          {createTagMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Criando...
            </>
          ) : (
            'Criar Etiqueta'
          )}
        </Button>
      </div>
    </div>
  );

  const renderManageView = () => (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode('select')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">Gerenciar Etiquetas</span>
      </div>
      
      <div className="max-h-[250px] overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          </div>
        ) : allTags.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma etiqueta cadastrada.
          </p>
        ) : (
          allTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
            >
              <TagBadge name={tag.name} color={tag.color} />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleStartEdit(tag)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setTagToDelete(tag)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setViewMode('create')}
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar nova etiqueta
      </Button>
    </div>
  );

  const renderEditView = () => (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancelEdit}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">Editar Etiqueta</span>
      </div>
      
      <div className="space-y-2">
        <Input
          placeholder="Nome da etiqueta"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEdit();
            }
          }}
        />
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setEditColor(color.value)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  editColor === color.value
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCancelEdit}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={updateTagMutation.isPending || !editName.trim()}
            size="sm"
            className="flex-1"
          >
            {updateTagMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      <div className={cn('space-y-2', className)}>
        <Label className="flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Etiquetas
        </Label>
        
        <Popover open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setViewMode('select');
            setSearchValue('');
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-start h-auto min-h-[42px] py-2"
            >
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <TagBadge
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      onRemove={() => handleRemoveTag(tag.id)}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Selecionar etiquetas...</span>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[300px] p-0" align="start">
            {viewMode === 'select' && renderSelectView()}
            {viewMode === 'create' && renderCreateView()}
            {viewMode === 'manage' && renderManageView()}
            {viewMode === 'edit' && renderEditView()}
          </PopoverContent>
        </Popover>
      </div>

      <DeleteConfirmDialog
        open={!!tagToDelete}
        onOpenChange={(open) => !open && setTagToDelete(null)}
        title="Excluir Etiqueta"
        description={`Tem certeza que deseja excluir a etiqueta "${tagToDelete?.name}"? Esta ação removerá a etiqueta de todos os negócios.`}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteTagMutation.isPending}
      />
    </>
  );
}
