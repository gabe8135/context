# Primeiro deploy — uso pessoal

## Estado verificado localmente

- Build de produção aprovado.
- Testes automatizados aprovados.
- Supabase URL e chave publicável configuradas localmente.
- Chave do cofre de credenciais configurada localmente.
- RLS habilitado nas tabelas utilizadas.
- Storage privado `workspace-files` criado e validado.

## Variáveis obrigatórias na Vercel

Cadastre em **Settings → Environment Variables**, no ambiente Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `CREDENTIALS_ENCRYPTION_KEY`

Os valores devem ser copiados do `.env.local`. O arquivo local não deve ser enviado ao Git.

## Publicação

1. Vincular esta pasta a um projeto Vercel.
2. Cadastrar as três variáveis de produção.
3. gerar um Preview Deployment;
4. validar login, projeto, tarefa, financeiro, arquivo e credencial;
5. promover o mesmo artefato validado para Production.

## Configuração obrigatória no Supabase após obter a URL

Em **Authentication → URL Configuration**:

- `Site URL`: URL final da produção;
- `Redirect URLs`: `https://SEU-DOMINIO/**` e a URL de preview usada no teste.

## Validação pós-deploy

- `/api/health` deve responder `status: ready` com HTTP 200.
- Cadastro, confirmação de e-mail, login e recuperação de senha devem retornar ao domínio publicado.
- Um arquivo enviado deve baixar por URL assinada.
- Uma credencial deve salvar, permanecer mascarada e abrir somente dentro do cofre autenticado.
- Nenhum erro deve aparecer no console durante o fluxo principal.

## Risco aceito para este deploy

O proprietário decidiu manter a chave Supabase anteriormente compartilhada. Esta decisão é aceita somente para o primeiro uso pessoal. A aplicação cliente utiliza apenas a chave publicável; nenhuma Secret Key deve existir em variável `NEXT_PUBLIC_*` ou no repositório.
