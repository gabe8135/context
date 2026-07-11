# Contexto

SaaS de organização profissional e preservação de contexto para freelancers e pequenas equipes. Esta entrega implementa a fundação real do produto e o dashboard contextual da Companhia da Limpeza.

## Implementado

- landing page, login/cadastro e tema claro/escuro;
- layout responsivo com navegação dos módulos;
- Supabase SSR com autenticação por cookies;
- workspaces e papéis preparados para equipe;
- schema de clientes, projetos, tarefas, decisões, atividades, alertas, financeiro, domínios, hospedagens e integrações;
- RLS por membership e permissões de escrita por papel;
- dashboard agregado a partir das tabelas;
- conclusão interativa de tarefas no preview (a persistência será conectada no próximo CRUD);
- PWA instalável e seed Companhia da Limpeza;
- testes unitários das regras financeiras e de vencimento.

## Ainda não implementado

CRUDs completos, reuniões, editor rico, arquivos/Storage, cofre criptografado, importação de texto, agenda, busca global real, alertas agendados e cobrança. Esses itens estão sequenciados em `ROADMAP.md`.

## Executar

Requer Node.js 20.9 ou superior.

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Sem `.env.local`, abra `http://localhost:3000` e use o modo de demonstração. Com Supabase, preencha URL e chave publicável.

## Supabase

1. Crie um projeto Supabase.
2. No SQL Editor, aplique `supabase/migrations/202607100001_initial_context.sql`.
3. Configure confirmação de e-mail em Auth conforme sua necessidade.
4. Crie uma conta pelo app.
5. Aplique `supabase/seed.sql`; ele associa a demonstração ao primeiro usuário.
6. Confirme que todas as tabelas públicas têm RLS ativo. Se o projeto estiver com exposição explícita da Data API, mantenha `public` exposto: a migration já concede acesso a `authenticated` e revoga `anon`.

Para ambiente local com Supabase CLI, use `supabase migration new` para migrations futuras e consulte `supabase --help`, pois a CLI muda com frequência.

## Deploy

Importe o repositório na Vercel, configure as duas variáveis de ambiente e publique. A aplicação não utiliza `service_role` no cliente.

## Decisões técnicas

Dados personalizados são renderizados no servidor; interatividade fica em componentes cliente pequenos. O banco é a autoridade de permissão. A função privada usada pela RLS evita recursão em `workspace_members`, valida `auth.uid()` e não é exposta a usuários anônimos.
