# Checklist do primeiro deploy — uso pessoal

Este documento prepara a publicação, mas não executa deploy, Git ou GitHub.

## Estado local aprovado

- autenticação, recuperação de senha e sessão por cookies;
- workspace isolado por RLS;
- clientes, projetos, tarefas, financeiro, decisões, reuniões e notas;
- infraestrutura, procedimentos, entregáveis e caixa de entrada;
- importação estruturada com revisão;
- arquivos privados versionados no Supabase Storage;
- cofre de credenciais com AES-256-GCM;
- busca global, relatório TXT, PWA e layout responsivo;
- headers básicos de segurança;
- testes unitários e build de produção.

## Antes de enviar os arquivos

1. Execute `npm run predeploy`.
2. Execute `npm run verify`.
3. Confirme que `.env.local`, `.env*` e `.vercel` não serão enviados.
4. Não inclua Secret Key ou `service_role` no código ou nas variáveis `NEXT_PUBLIC_*`.
5. Confirme que as migrations `001` a `005` foram aplicadas no projeto CTXT.

## Variáveis na hospedagem

Cadastrar no ambiente de produção, preservando exatamente os valores locais:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
CREDENTIALS_ENCRYPTION_KEY
```

`CREDENTIALS_ENCRYPTION_KEY` é segredo somente do servidor e não pode receber o prefixo `NEXT_PUBLIC_`. Perder ou alterar essa chave impede abrir credenciais já salvas.

## Supabase Auth após obter a URL pública

No painel do Supabase, em Authentication → URL Configuration:

1. definir **Site URL** como a URL pública definitiva;
2. adicionar em **Redirect URLs**:
   - `https://SEU-DOMINIO/auth/callback`
   - a URL de preview, somente se ela for utilizada para autenticação;
3. manter `http://localhost:3000/auth/callback` para desenvolvimento;
4. testar cadastro, confirmação de e-mail, login e recuperação de senha.

## Teste obrigatório na URL publicada

1. Entrar com a conta pessoal.
2. Abrir `/app/projetos` após o login.
3. Criar cliente e projeto temporários.
4. Criar, concluir e atualizar uma tarefa; recarregar a página.
5. Registrar receita e despesa; conferir os totais.
6. Criar decisão, nota e reunião.
7. Importar uma anotação e revisar os itens.
8. Enviar e baixar um arquivo.
9. Salvar, revelar, ocultar e validar uma credencial.
10. Baixar o relatório TXT do projeto.
11. Excluir ou arquivar os registros temporários.

## Critério de liberação

Uso pessoal está liberado quando `npm run predeploy`, `npm run verify` e os 11 testes publicados forem aprovados. Falha em autenticação, RLS, Storage ou cofre bloqueia o uso com dados reais.
