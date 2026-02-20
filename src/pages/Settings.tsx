import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, User, Shield, Loader2, Mail } from 'lucide-react';
import { useUserSignature } from '@/hooks/useUserSignature';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';
import { z } from 'zod';
import { getErrorMessage } from '@/services/supabaseErrors';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().optional(),
});

export default function Settings() {
  const { profile, role, user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const { signature, isLoading: isLoadingSignature, saveSignature, isSaving } = useUserSignature();
  const [signatureHtml, setSignatureHtml] = useState('');

  useEffect(() => {
    if (signature?.signature_html) {
      setSignatureHtml(signature.signature_html);
    }
  }, [signature]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar perfil: ' + getErrorMessage(error));
    },
  });

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    const validation = profileSchema.safeParse({ fullName, phone });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setProfileErrors(fieldErrors);
      return;
    }
    updateProfileMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu perfil e preferências
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Informações da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
              {profileErrors.fullName && <p className="text-sm text-destructive">{profileErrors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput
                id="phone"
                value={phone}
                onValueChange={setPhone}
              />
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões
          </CardTitle>
          <CardDescription>
            Seu nível de acesso no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-sm">
              {isAdmin ? 'Administrador' : 'Corretor'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Você tem acesso total ao sistema'
                : 'Você pode gerenciar seus próprios registros'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Email Signature Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Assinatura de Email
          </CardTitle>
          <CardDescription>
            Sua assinatura será incluída automaticamente em todos os emails enviados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSignature ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <RichTextEditor
                content={signatureHtml}
                onChange={setSignatureHtml}
                placeholder="Digite sua assinatura aqui (nome, cargo, telefone, site...)"
                minHeight="120px"
              />
              <Button
                onClick={() => saveSignature(signatureHtml)}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Assinatura
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
