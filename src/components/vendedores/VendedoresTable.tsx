import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Shield, User } from 'lucide-react';
import { Vendedor, useUpdateVendedorRole } from '@/hooks/useVendedores';
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
import { VendedorFormSheet } from './VendedorFormSheet';

interface VendedoresTableProps {
  vendedores: Vendedor[];
}

export function VendedoresTable({ vendedores }: VendedoresTableProps) {
  const { user } = useAuth();
  const updateRole = useUpdateVendedorRole();
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'corretor') => {
    // Prevent changing own role
    if (userId === user?.id) {
      return;
    }
    updateRole.mutate({ userId, role });
  };

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Vendedor</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores.map((vendedor) => (
              <TableRow key={vendedor.id} className="group">
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
                      {vendedor.user_id === user?.id && (
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
                  {vendedor.user_id === user?.id ? (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingVendedor(vendedor)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
    </>
  );
}
