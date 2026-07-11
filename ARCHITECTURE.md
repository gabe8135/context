# Arquitetura

## Stack

Next.js App Router em JavaScript, React, Tailwind CSS, Supabase Auth/Postgres/Storage, Zod, React Hook Form, date-fns e Lucide. Server Components fazem leitura; Server Actions fazem mutações; Client Components ficam restritos à interação.

## Camadas

```text
src/app           rotas, layouts e ações
src/components    interface reutilizável
src/lib           clientes Supabase, validação e utilitários
src/services      consultas e regras de negócio
src/data          dados somente para preview local explícito
supabase          migrations e seed reproduzível
tests             regras de negócio
```

## Fluxo

Browser → App Router → autenticação Supabase por cookie → serviço de domínio → Postgres com RLS. Toda consulta de negócio carrega `workspace_id`; RLS verifica associação ativa em `workspace_members`.

## Autenticação

`@supabase/ssr` cria clientes browser/server. O proxy atualiza cookies de sessão e protege `/app`. A autorização real permanece no banco e nos Server Components; redirecionamento não substitui RLS.

## Dados e modo de preview

Com variáveis Supabase configuradas, toda leitura vem do banco. Sem variáveis, a aplicação entra em modo de preview claramente identificado e usa uma fixture isolada; mutações persistentes são desabilitadas. Isso permite avaliação visual sem misturar mocks ao caminho de produção.

## Decisões

- `workspace_id` desnormalizado nas entidades reduz joins de autorização e facilita índices.
- dashboard é uma composição de consultas específicas, não uma página preenchida manualmente.
- valores financeiros são armazenados em centavos.
- exclusão lógica usa `archived_at`/`deleted_at` onde histórico importa.
- alertas derivados serão materializados por job futuro; na entrega inicial, seed e consultas usam registros persistidos.
