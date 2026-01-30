import { useState, useMemo } from 'react';
import { Check, Plus, Tags, Loader2 } from 'lucide-react';
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
import { PersonTagBadge } from './PersonTagBadge';
import { 
  usePersonTags, 
  useCreatePersonTag,
  TAG_COLORS,
  type PersonTag 
} from '@/hooks/usePersonTags';
import { toast } from 'sonner';

interface PersonTagsSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

export function PersonTagsSelector({ 
  selectedTagIds, 
  onTagsChange,
  className 
}: PersonTagsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[4].value); // Azul como padrão
  const [searchValue, setSearchValue] = useState('');
  
  const { data: allTags = [], isLoading } = usePersonTags();
  const createTagMutation = useCreatePersonTag();
  
  // Tags selecionadas com dados completos
  const selectedTags = useMemo(() => {
    return allTags.filter(tag => selectedTagIds.includes(tag.id));
  }, [allTags, selectedTagIds]);
  
  // Filtrar tags pela busca
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
  
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Digite um nome para a etiqueta');
      return;
    }
    
    // Verificar se já existe uma tag com esse nome
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
      
      // Selecionar a nova tag automaticamente
      onTagsChange([...selectedTagIds, newTag.id]);
      
      // Limpar formulário
      setNewTagName('');
      setNewTagColor(TAG_COLORS[4].value);
      setShowCreateForm(false);
      
      toast.success('Etiqueta criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar etiqueta');
    }
  };
  
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="flex items-center gap-2">
        <Tags className="h-4 w-4" />
        Etiquetas
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
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
                  <PersonTagBadge
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
          {showCreateForm ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Nova Etiqueta</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
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
          ) : (
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
                          <PersonTagBadge
                            name={tag.name}
                            color={tag.color}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
                
                <CommandSeparator />
                
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setShowCreateForm(true)}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar nova etiqueta
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
