# Product Spec — Contexto

## Visão

Contexto é um sistema que organiza e preserva o contexto profissional de quem administra vários clientes e projetos. O produto transforma tarefas, decisões, valores, infraestrutura e histórico em entidades relacionadas e apresenta o que exige ação agora.

## Problema e proposta

Anotações longas funcionam no início de um projeto, mas misturam estado atual e histórico. O usuário passa a procurar manualmente pendências, valores, decisões e acessos. Contexto aplica quatro princípios: capturar primeiro; classificar depois; separar atual de histórico; calcular o que já pode ser inferido.

## Usuários iniciais

Freelancers, desenvolvedores, designers, técnicos, consultores e pequenas agências que trabalham com múltiplos clientes.

## Escopo da entrega inicial

- landing page e autenticação por e-mail;
- criação automática do primeiro workspace;
- navegação responsiva, tema claro/escuro e comando rápido;
- clientes e projetos;
- dashboard de projeto calculado a partir de tarefas, decisões, atividades, finanças e infraestrutura;
- tarefas básicas, decisões, alertas e atividade;
- resumo financeiro e técnico;
- migrations com isolamento por workspace e seed separado da Companhia da Limpeza;
- PWA e estados essenciais de interface.

## Fora do escopo inicial

Editor rico completo, cofre de credenciais, agenda com drag-and-drop, upload versionado, importação inteligente, integrações externas, equipes avançadas e cobrança da assinatura. A arquitetura reserva esses módulos sem fingir que já estão prontos.

## Critérios desta entrega

Um usuário pode autenticar-se, acessar um workspace, consultar clientes e projetos e abrir o projeto de demonstração. O dashboard responde: o que exige atenção, quais são as próximas tarefas, quanto foi recebido e está pendente, como está a infraestrutura, qual foi a última decisão e a última atividade.

## Métricas iniciais

- ativação: primeiro cliente e projeto criados;
- retorno semanal: workspace com atividade em 7 dias;
- tempo para localizar uma pendência: abaixo de 10 segundos;
- projetos com próxima ação definida;
- alertas resolvidos ou adiados.
