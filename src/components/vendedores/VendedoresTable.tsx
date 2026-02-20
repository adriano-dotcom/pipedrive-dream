import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Shield, User, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Vendedor, useUpdateVendedorRole, useToggleVendedorActive, useDeleteVendedor } from '@/hooks/useVendedores';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VendedorFormSheet } from './VendedorFormSheet';

interface VendedoresTableProps {
  vendedores: Vendedor[];
}

export function VendedoresTable({ vendedores }: VendedoresTableProps) {
  const { user } = useAuth();
  const updateRole = useUpdateVendedorRole();
  const toggleActive = useToggleVendedorActive();
  const deleteVendedor = useDeleteVendedor();
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [inactivateTarget, setInactivateTarget] = useState<Vendedor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendedor | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'corretor') => {
    if (userId === user?.id) return;
    updateRole.mutate({ userId, role });
  };

  const isSelf = (vendedor: Vendedor) => vendedor.user_id === user?.id;

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Vendedor</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores.map((vendedor) => (
              <TableRow key={vendedor.id} className={`group ${!vendedor.is_active ? 'opacity-50' : ''}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={vendedor.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(vendedor.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{vendedor.full_name}</span>
                      {isSelf(vendedor) && (
                        <span className="text-xs text-muted-foreground">(você)</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {vendedor.phone || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  {vendedor.is_active ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isSelf(vendedor) ? (
                    <Badge 
                      variant="outline" 
                      className={vendedor.role === 'admin' 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-muted text-muted-foreground'
                      }
                    >
                      {vendedor.role === 'admin' ? (
                        <><Shield className="mr-1 h-3 w-3" /> Admin</>
                      ) : (
                        <><User className="mr-1 h-3 w-3" /> Corretor</>
                      )}
                    </Badge>
                  ) : (
                    <Select
                      value={vendedor.role}
                      onValueChange={(value) => handleRoleChange(vendedor.user_id, value as 'admin' | 'corretor')}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="corretor">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Corretor
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {format(new Date(vendedor.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell>
                  {isSelf(vendedor) ? null : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingVendedor(vendedor)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setInactivateTarget(vendedor)}>
                          {vendedor.is_active ? (
                            <><UserX className="mr-2 h-4 w-4" /> Inativar</>
                          ) : (
                            <><UserCheck className="mr-2 h-4 w-4" /> Reativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(vendedor)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VendedorFormSheet
        vendedor={editingVendedor}
        open={!!editingVendedor}
        onOpenChange={(open) => !open && setEditingVendedor(null)}
      />

      {/* Inativar/Reativar Dialog */}
      <AlertDialog open={!!inactivateTarget} onOpenChange={(open) => !open && setInactivateTarget(null)}>
        <AlertDialogContent className="max-w-[95vw] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {inactivateTarget?.is_active ? 'Inativar vendedor?' : 'Reativar vendedor?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inactivateTarget?.is_active
                ? `"${inactivateTarget?.full_name}" será marcado como inativo. O perfil e histórico serão preservados.`
                : `"${inactivateTarget?.full_name}" será reativado e poderá acessar o sistema novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={toggleActive.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (inactivateTarget) {
                  toggleActive.mutate(
                    { userId: inactivateTarget.user_id, isActive: !inactivateTarget.is_active },
                    { onSuccess: () => setInactivateTarget(null) }
                  );
                }
              }}
              disabled={toggleActive.isPending}
            >
              {inactivateTarget?.is_active ? 'Inativar' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[95vw] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.full_name}"</strong> perderá o acesso ao sistema. O perfil será mantido como registro histórico (inativo). O usuário poderá se recadastrar depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteVendedor.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) {
                  deleteVendedor.mutate(
                    { userId: deleteTarget.user_id },
                    { onSuccess: () => setDeleteTarget(null) }
                  );
                }
              }}
              disabled={deleteVendedor.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
