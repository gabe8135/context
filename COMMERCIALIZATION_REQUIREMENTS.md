# Requisitos antes da comercialização

Esta lista não bloqueia o primeiro deploy privado para uso pessoal. Ela passa a ser obrigatória antes de vender o Contexto ou permitir workspaces de terceiros.

## Segurança e privacidade

- Rotacionar todas as chaves que já tenham sido compartilhadas fora dos ambientes seguros.
- Validar isolamento RLS com ao menos dois usuários em workspaces diferentes.
- Testar acesso direto por ID em todas as páginas e Server Actions.
- Implementar rate limiting em login, recuperação, uploads, importação e revelação de credenciais.
- Criar trilha de auditoria para acesso e alteração de credenciais.
- Definir retenção, exportação e exclusão de dados em conformidade com a LGPD.
- Publicar Política de Privacidade, Termos de Uso e canal para solicitações do titular.
- Configurar monitoramento de erros, logs e alertas operacionais.

## Contas, equipes e permissões

- Onboarding autônomo com criação consistente do workspace.
- Convites de equipe, remoção de membros e transferência de propriedade.
- Papéis com permissões granulares e testes de autorização.
- Tela de perfil, workspace, segurança e encerramento da conta.

## Planos e cobrança

- Definir planos, limites e período de teste.
- Integrar checkout, assinatura, faturas e portal do cliente.
- Processar webhooks com idempotência e assinatura validada.
- Bloquear ou reduzir recursos conforme o estado da assinatura sem perder dados.
- Medir uso de storage, membros, projetos e recursos sujeitos a limite.

## Produto e operação

- Modelos de projeto e onboarding guiado.
- E-mails transacionais com domínio verificado.
- Testes E2E dos fluxos críticos e execução em CI.
- Política de backup e teste de restauração.
- Ambiente de preview separado dos dados de produção.
- Analytics de ativação, retenção e erros sem capturar segredos.
- Suporte, documentação e processo de resposta a incidentes.

## Critério de liberação comercial

O produto somente deve receber clientes pagantes quando isolamento, cobrança, recuperação de conta, observabilidade, backup, LGPD e testes E2E estiverem validados em produção.
