
# Plano: Cadastrar Canais WhatsApp no Sistema

## Situação Atual

### Canais Existentes (2)
| Nome | Telefone | Vendedor |
|------|----------|----------|
| Leonardo Sanches | +554391915894 | - |
| Adriana Jacometo | +554391243257 | ADRIANO JACOMETO |

### Canais a Cadastrar (5)
| Nome | Telefone (timelines_channel_id) |
|------|----------------------------------|
| Bárbara Francisconi | 554391804597 |
| Jacometo Seguros | 554333215007 |
| Alessandro Francisco | 554391155007 |
| Adriano Jacometo (eu) | 554333789100 |
| García Neto | 554391255007 |

### Perfis Disponíveis (1)
- ADRIANO JACOMETO (id: 3cff3bef-96bd-4f0e-a2fd-22a81525f4dd)

## Ação Necessária

Inserir os 5 canais que faltam na tabela `whatsapp_channels`:

```sql
INSERT INTO whatsapp_channels (name, timelines_channel_id, phone_number, is_active)
VALUES 
  ('Bárbara Francisconi', '554391804597', '+554391804597', true),
  ('Jacometo Seguros', '554333215007', '+554333215007', true),
  ('Alessandro Francisco', '554391155007', '+554391155007', true),
  ('Adriano Jacometo (eu)', '554333789100', '+554333789100', true),
  ('García Neto', '554391255007', '+554391255007', true);
```

## Observação

Os canais serão cadastrados sem vendedor vinculado (`owner_id = null`). Após a inserção, você poderá vincular cada canal ao vendedor responsável diretamente na interface de administração `/timelinesai`.

Atualmente há apenas 1 perfil de vendedor cadastrado (ADRIANO JACOMETO). Para vincular os outros canais a seus respectivos donos, será necessário que esses vendedores façam login no sistema para criar seus perfis.
