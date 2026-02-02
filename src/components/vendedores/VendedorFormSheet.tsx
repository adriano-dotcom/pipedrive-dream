import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, User } from 'lucide-react';
import { Vendedor, useUpdateVendedorProfile } from '@/hooks/useVendedores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VendedorFormSheetProps {
  vendedor: Vendedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendedorFormSheet({ vendedor, open, onOpenChange }: VendedorFormSheetProps) {
  const updateProfile = useUpdateVendedorProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (vendedor) {
      form.reset({
        fullName: vendedor.full_name,
        phone: vendedor.phone || '',
      });
    }
  }, [vendedor, form]);

  const onSubmit = async (data: FormData) => {
    if (!vendedor) return;

    await updateProfile.mutateAsync({
      userId: vendedor.user_id,
      fullName: data.fullName,
      phone: data.phone || null,
    });

    onOpenChange(false);
  };

  if (!vendedor) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar Vendedor</SheetTitle>
          <SheetDescription>
            Atualize as informações do perfil do vendedor.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">Role Atual</span>
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
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do vendedor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(11) 99999-9999" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
