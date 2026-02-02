import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { Lock } from 'lucide-react';
import { WhatsAppChannel, useUpdateWhatsAppChannel, useCreateWhatsAppChannel } from '@/hooks/useWhatsAppChannels';
import { useTeamMembers } from '@/hooks/useTeamMembers';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone_number: z.string().optional(),
  timelines_channel_id: z.string().min(1, 'ID do canal é obrigatório'),
  owner_id: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ChannelFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: WhatsAppChannel | null;
}

export function ChannelFormSheet({ open, onOpenChange, channel }: ChannelFormSheetProps) {
  const { data: teamMembers = [] } = useTeamMembers();
  const updateChannel = useUpdateWhatsAppChannel();
  const createChannel = useCreateWhatsAppChannel();
  const isEditing = !!channel;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone_number: '',
      timelines_channel_id: '',
      owner_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        phone_number: channel.phone_number || '',
        timelines_channel_id: channel.timelines_channel_id,
        owner_id: channel.owner_id || '',
        is_active: channel.is_active ?? true,
      });
    } else {
      form.reset({
        name: '',
        phone_number: '',
        timelines_channel_id: '',
        owner_id: '',
        is_active: true,
      });
    }
  }, [channel, form]);

  const onSubmit = async (values: FormValues) => {
    const data = {
      name: values.name,
      phone_number: values.phone_number || null,
      owner_id: values.owner_id || null,
      is_active: values.is_active,
    };

    if (isEditing) {
      await updateChannel.mutateAsync({ channelId: channel.id, data });
    } else {
      await createChannel.mutateAsync({
        ...data,
        timelines_channel_id: values.timelines_channel_id,
      });
    }
    onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar Canal' : 'Adicionar Canal'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Edite as informações do canal WhatsApp.'
              : 'Adicione um novo canal WhatsApp manualmente.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Canal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vendas Corporativas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="+55 43 91234-5678" {...field} />
                  </FormControl>
                  <FormDescription>
                    Número associado a este canal no Timelines.ai
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timelines_channel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timelines Channel ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="554391234567"
                        {...field}
                        disabled={isEditing}
                        className={isEditing ? 'pr-10' : ''}
                      />
                      {isEditing && (
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? 'Este ID não pode ser alterado após a criação.'
                      : 'ID único do canal no Timelines.ai'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor Responsável</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um vendedor" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>
                    Vendedor que receberá as mensagens deste canal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Canal Ativo</FormLabel>
                    <FormDescription>
                      Canais inativos não processam novas mensagens
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateChannel.isPending || createChannel.isPending}
              >
                {updateChannel.isPending || createChannel.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
