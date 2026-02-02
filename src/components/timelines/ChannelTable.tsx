import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Trash2 } from 'lucide-react';
import { WhatsAppChannel, useUpdateWhatsAppChannel, useDeleteWhatsAppChannel } from '@/hooks/useWhatsAppChannels';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

interface ChannelTableProps {
  channels: WhatsAppChannel[];
  onEdit: (channel: WhatsAppChannel) => void;
}

export function ChannelTable({ channels, onEdit }: ChannelTableProps) {
  const { data: teamMembers = [] } = useTeamMembers();
  const updateChannel = useUpdateWhatsAppChannel();
  const deleteChannel = useDeleteWhatsAppChannel();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<WhatsAppChannel | null>(null);

  const handleOwnerChange = (channelId: string, ownerId: string) => {
    updateChannel.mutate({
      channelId,
      data: { owner_id: ownerId === 'none' ? null : ownerId },
    });
  };

  const handleActiveToggle = (channelId: string, isActive: boolean) => {
    updateChannel.mutate({
      channelId,
      data: { is_active: isActive },
    });
  };

  const handleDeleteClick = (channel: WhatsAppChannel) => {
    setChannelToDelete(channel);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (channelToDelete) {
      deleteChannel.mutate(channelToDelete.id);
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '-';
    return phone;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Vendedor Responsável</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {channels.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhum canal WhatsApp cadastrado
              </TableCell>
            </TableRow>
          ) : (
            channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-emerald-500 text-lg">📱</span>
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {channel.timelines_channel_id}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatPhoneNumber(channel.phone_number)}</TableCell>
                <TableCell>
                  <Select
                    value={channel.owner_id || 'none'}
                    onValueChange={(value) => handleOwnerChange(channel.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione um vendedor">
                        {channel.owner ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={channel.owner.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(channel.owner.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{channel.owner.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nenhum</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Nenhum</span>
                      </SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.full_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={channel.is_active ?? true}
                      onCheckedChange={(checked) => handleActiveToggle(channel.id, checked)}
                    />
                    <Badge
                      variant={channel.is_active ? 'default' : 'secondary'}
                      className={channel.is_active ? 'bg-emerald-500' : ''}
                    >
                      {channel.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(channel)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(channel)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Canal"
        description={`Tem certeza que deseja excluir o canal "${channelToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}
