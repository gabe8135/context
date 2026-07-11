# Banco de dados

## Núcleo da primeira entrega

- `profiles` 1:1 com `auth.users`;
- `workspaces` e `workspace_members` (owner/admin/member/viewer);
- `clients` pertencem a workspace;
- `projects` pertencem a cliente e workspace;
- `tasks`, `decisions`, `activities`, `alerts`, `financial_entries`, `domains`, `hosting_accounts` e `integrations` pertencem a projeto e workspace.

## Relações futuras

Notas, reuniões, credenciais, procedimentos, arquivos, entregáveis, tags, agenda e relações genéricas serão adicionados em migrations posteriores. `entity_relations` conectará entidades sem colunas polimórficas espalhadas.

## Segurança

Todas as tabelas públicas têm RLS. Políticas usam `TO authenticated`, `(select auth.uid())`, `USING` e `WITH CHECK`. O acesso exige membership ativo. Índices cobrem `workspace_id`, chaves estrangeiras, status e datas. Nenhuma regra usa `user_metadata`.

## Financeiro

`amount_cents` é inteiro positivo. Tipo e status determinam recebido, pendente, vencido e despesas. O valor combinado do projeto é `agreed_value_cents`; o dashboard agrega lançamentos, evitando totais duplicados.

## Seed

`supabase/seed.sql` contém apenas a demonstração Companhia da Limpeza e usa UUIDs estáveis. O script deve ser executado depois da migration e associa a demonstração ao primeiro usuário existente.
