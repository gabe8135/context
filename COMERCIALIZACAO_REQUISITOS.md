# Requisitos para comercializar o Contexto

O primeiro deploy será de uso pessoal. Os itens abaixo não bloqueiam esse uso, mas devem ser concluídos antes de vender o produto ou permitir contas de terceiros.

## 1. Conta, onboarding e workspaces

- onboarding guiado para primeiro cliente e primeiro projeto;
- criação e escolha explícita de workspace;
- convites por e-mail;
- papéis de proprietário, administrador, colaborador e somente leitura;
- troca e remoção segura de membros;
- teste automatizado de isolamento entre pelo menos dois workspaces.

## 2. Assinaturas e limites

- definição de planos, preços, teste gratuito e política de cancelamento;
- checkout e portal de assinatura;
- webhooks idempotentes de pagamento;
- limites por plano para usuários, projetos, arquivos e armazenamento;
- bloqueio previsível por inadimplência sem destruir dados;
- emissão de comprovantes e tratamento fiscal conforme o modelo comercial.

## 3. Segurança de produto

- rate limiting para login, recuperação, upload, importação e revelação de credenciais;
- trilha de auditoria para acesso a credenciais e ações administrativas;
- política de senha, MFA opcional e encerramento de sessões;
- rotação e versionamento da chave do cofre;
- varredura de arquivos enviados e validação reforçada de MIME;
- revisão de todas as policies RLS e teste contra IDOR/BOLA;
- política de backup, restauração e resposta a incidentes;
- gestão de segredos separada para desenvolvimento, preview e produção.

## 4. Privacidade e obrigações legais

- Termos de Uso e Política de Privacidade;
- base legal, retenção e exclusão de dados conforme LGPD;
- exportação dos dados do workspace;
- exclusão de conta e prazo de recuperação;
- canal de suporte e contato do controlador;
- contratos e subprocessadores documentados.

## 5. Confiabilidade e operação

- testes E2E dos fluxos críticos em navegador desktop e mobile;
- monitoramento de erros, logs estruturados e alertas;
- métricas de disponibilidade e desempenho;
- página de status e procedimento de rollback;
- filas para tarefas demoradas e tentativas idempotentes;
- suporte, priorização de incidentes e histórico de mudanças.

## 6. Experiência comercial

- configurações de perfil, workspace e notificações;
- modelos de projeto e onboarding por profissão;
- e-mails transacionais com domínio verificado;
- central de ajuda e tutoriais;
- acessibilidade e revisão completa de textos;
- analytics de ativação, retenção e conversão com consentimento adequado.

## Portão para iniciar vendas

Não liberar cadastro público pago até que isolamento multiworkspace, cobrança, rate limiting, auditoria, recuperação de dados, documentos legais, monitoramento e testes E2E estejam aprovados. Esses são os requisitos mínimos; integrações avançadas podem entrar depois da primeira venda controlada.
