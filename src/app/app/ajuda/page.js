import {
  Archive,
  Bell,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Eye,
  FolderKanban,
  KeyRound,
  Lightbulb,
  Network,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const quickSteps = [
  [Users, "Cadastre o cliente", "Centralize os dados da pessoa ou empresa antes de criar o trabalho."],
  [FolderKanban, "Crie o projeto", "Defina responsável, valor, prioridade e vincule o cliente correto."],
  [CheckSquare, "Planeje as tarefas", "Registre ações e prazos. O progresso nasce das tarefas concluídas."],
  [CircleDollarSign, "Controle o dinheiro", "Lance previsão, pagamentos parciais, despesas e descontos."],
];

const modules = [
  {
    id: "rotina",
    icon: CheckCircle2,
    title: "Rotina de trabalho",
    description: "Um fluxo simples para manter o Squire confiável todos os dias.",
    items: [
      ["Início", "Veja afazeres pessoais, atrasos relevantes e projetos recentes sem excesso de métricas."],
      ["Agenda", "Consulte tarefas, reuniões e eventos; clique em um item para visualizar antes de editar."],
      ["Projetos", "Entre no projeto para trabalhar apenas com informações daquele contexto."],
      ["Encerramento", "Conclua tarefas, atualize pagamentos e registre decisões importantes."],
    ],
  },
  {
    id: "agenda",
    icon: CalendarDays,
    title: "Agenda, compromissos e notificações",
    description: "Tarefas, reuniões e eventos com data aparecem juntos no calendário.",
    items: [
      ["Calendário mensal", "Dias destacados possuem compromissos. O número no canto informa quantos itens existem naquele dia."],
      ["Ver detalhes", "Clique em um compromisso para abrir seus detalhes. A edição só começa quando você escolhe o botão Editar."],
      ["Agenda geral", "Mostra compromissos pessoais e de todos os projetos aos quais você tem acesso."],
      ["Agenda do projeto", "Quando um projeto está em foco, exibe somente compromissos relacionados a ele."],
      ["Notificar antes", "Ao criar ou editar um evento ou reunião, escolha quando deseja ser avisado."],
      ["Permissão", "As notificações dependem da permissão do navegador e podem precisar ser liberadas nas configurações do site."],
    ],
  },
  {
    id: "visualizacao",
    icon: Eye,
    title: "Visualizar antes de editar",
    description: "As listagens priorizam consulta rápida e evitam alterações acidentais.",
    items: [
      ["Clientes", "Clique em Visualizar para abrir contatos, observações e projetos em um modal."],
      ["Compromissos", "O clique abre os detalhes; use Editar somente quando realmente quiser alterar o registro."],
      ["Tarefas e notas", "Na página do projeto, o primeiro clique abre a visualização completa em modal."],
      ["Fechar modal", "Use o botão Fechar, a tecla Esc ou clique fora da janela."],
      ["Abrir tudo", "Use os links de seção quando precisar navegar pela listagem completa daquele tipo."],
    ],
  },
  {
    id: "contextos",
    icon: Network,
    title: "Área geral e contexto em foco",
    description: "O menu muda para mostrar somente o que importa naquele momento.",
    items: [
      ["Área geral", "Reúne todos os clientes, projetos, tarefas, finanças e registros do workspace."],
      ["Projeto em foco", "Tarefas, notas, decisões, financeiro e materiais ficam filtrados pelo projeto."],
      ["Cliente em foco", "Mostra o cadastro e os projetos ligados exclusivamente ao cliente."],
      ["Voltar à visão geral", "Sai do contexto específico e recupera a visão consolidada."],
    ],
  },
  {
    id: "financeiro",
    icon: CircleDollarSign,
    title: "Financeiro sem surpresas",
    description: "Valores são calculados pelo status e pelo projeto vinculado.",
    items: [
      ["Recebido", "Soma das receitas com status pago."],
      ["Pendente", "Valor previsto ainda não recebido, considerando descontos."],
      ["Despesas", "Custos pagos vinculados ao projeto."],
      ["Pagamentos parciais", "Registre cada parcela separadamente para preservar o histórico real."],
      ["Projetos arquivados", "Seus lançamentos deixam os totais ativos, mas permanecem preservados."],
    ],
  },
  {
    id: "memoria",
    icon: Lightbulb,
    title: "Memória do trabalho",
    description: "Cada tipo de informação tem uma função clara.",
    items: [
      ["Decisão", "Registra o que foi definido, por quem e qual decisão anterior foi substituída."],
      ["Nota", "Guarda referência e contexto; edições geram versões históricas."],
      ["Reunião", "Concentra participantes, pauta, anotações e resumo."],
      ["Histórico", "Forma a linha do tempo das atividades realizadas no projeto."],
      ["Relações", "Conecta registros relacionados para facilitar a compreensão do contexto."],
    ],
  },
  {
    id: "materiais",
    icon: PackageCheck,
    title: "Materiais do projeto",
    description: "Tudo o que sustenta a entrega fica junto do projeto.",
    items: [
      ["Entregáveis", "Itens que precisam ser produzidos, revisados, aprovados ou enviados."],
      ["Procedimentos", "Passos e checklists reutilizáveis para executar o trabalho."],
      ["Arquivos", "Storage privado com upload, download e versões por nome lógico."],
      ["Infraestrutura", "Domínios, DNS, hospedagem, SSL e serviços de e-mail."],
      ["Credenciais", "Cofre criptografado para segredos; nunca coloque senhas em notas ou na IA."],
    ],
  },
  {
    id: "ia",
    icon: Bot,
    title: "IA com você no controle",
    description: "A inteligência interpreta e propõe; nada é salvo sem confirmação.",
    items: [
      ["Organizar anotações", "Agrupa, divide e classifica um texto solto antes da importação."],
      ["Assistente Squire", "Lê o contexto permitido e propõe tarefas, notas ou decisões."],
      ["Revisão", "Edite, rejeite um item ou descarte toda a proposta antes de confirmar."],
      ["Contexto", "Ao abrir pelo projeto ou cliente, o assistente trabalha somente naquele escopo."],
      ["Proteção", "Credenciais e padrões de segredo são ocultados antes do envio ao modelo."],
    ],
  },
];

const statuses = [
  ["A fazer", "Ainda não iniciada"],
  ["Em andamento", "Está sendo executada"],
  ["Em revisão", "Aguarda conferência"],
  ["Aguardando cliente", "Depende de resposta externa"],
  ["Concluída", "Conta no progresso do projeto"],
  ["Pago", "Valor efetivamente recebido ou quitado"],
  ["Previsão", "Valor esperado, ainda não pago"],
  ["Arquivado", "Oculto da rotina, mas preservado"],
];

const recordChoices = [
  [CheckSquare, "Tarefa", "Existe uma ação a executar", "Enviar orçamento até sexta-feira"],
  [FileText, "Nota", "É uma informação para consultar depois", "Cliente prefere comunicação por WhatsApp"],
  [Lightbulb, "Decisão", "Uma escolha foi feita e precisa ser preservada", "O projeto usará WordPress"],
  [CalendarDays, "Reunião", "Houve ou haverá uma conversa com data e participantes", "Alinhamento de escopo com o cliente"],
  [PackageCheck, "Entregável", "É algo concreto que precisa ser entregue ou aprovado", "Versão final da identidade visual"],
  [ClipboardList, "Procedimento", "É um passo a passo que poderá ser repetido", "Checklist para publicar um site"],
];

const areas = [
  ["Visão geral", "Painel inicial com um resumo de todo o seu workspace.", "Começar o dia e entender rapidamente projetos, tarefas, valores e atividades recentes."],
  ["Entrada", "Centraliza tudo que pede atenção agora ou em breve.", "Ver tarefas abertas, atrasos, cobranças vencidas e compromissos próximos."],
  ["Agenda", "Calendário mensal de tarefas, reuniões e eventos com data marcada, detalhes e lembretes.", "Planejar a semana, consultar compromissos e escolher quando receber uma notificação."],
  ["Clientes", "Cadastro da pessoa ou empresa que contrata seus serviços. A listagem abre uma visualização com contatos e projetos.", "Guardar contato, origem, projetos relacionados e histórico do relacionamento antes de entrar na pasta completa."],
  ["Projetos", "É o trabalho principal realizado para um cliente. Reúne todas as informações relacionadas.", "Separar serviços, contratos ou iniciativas. Exemplo: “Site da Empresa X”."],
  ["Tarefas", "Ações práticas que precisam ser feitas. Tarefas concluídas calculam o progresso do projeto.", "Registrar um próximo passo com responsável, prioridade e prazo."],
  ["Financeiro", "Controla previsões, receitas pagas, pagamentos parciais, despesas e descontos.", "Saber o que recebeu, o que ainda falta receber e o resultado real do projeto."],
  ["Decisões", "Preserva escolhas importantes e o motivo delas.", "Evitar rediscutir assuntos já definidos e registrar quando uma decisão substitui outra."],
  ["Reuniões", "Registra data, participantes, pauta, notas e resumo de uma conversa.", "Preparar encontros e guardar o que foi discutido com cliente ou equipe."],
  ["Notas", "Guarda conhecimento e referências que não são ações nem decisões. Alterações criam versões.", "Registrar contexto, observações, textos e informações para consulta futura."],
  ["Infraestrutura", "Inventário técnico de domínios, DNS, SSL, hospedagem e serviços de e-mail.", "Controlar vencimentos e saber onde cada ativo técnico está configurado."],
  ["Arquivados", "Área de itens retirados da rotina sem apagar o histórico.", "Guardar projetos e clientes encerrados e restaurá-los quando necessário."],
  ["Assistente Squire", "Conversa com uma IA que lê somente o contexto permitido e cria propostas revisáveis.", "Pedir resumos, consultar o projeto ou propor tarefas, notas e decisões. Nada é salvo sem confirmação."],
  ["Organizar anotações", "Transforma um texto solto em poucos registros estruturados.", "Importar anotações do Notion, atas ou históricos longos, revisando tudo antes de salvar."],
  ["Caixa de entrada", "Local de captura rápida para algo que ainda não foi classificado.", "Anotar uma ideia ou pedido imediatamente e decidir depois se vira tarefa ou nota."],
  ["Procedimentos", "Passos e checklists reutilizáveis para executar um trabalho.", "Documentar tarefas recorrentes para não depender da memória."],
  ["Entregáveis", "Produtos ou resultados que precisam ser produzidos, enviados e aprovados.", "Controlar arquivos finais, páginas, relatórios, artes ou qualquer entrega ao cliente."],
  ["Credenciais", "Cofre criptografado para senhas, tokens e acessos sensíveis.", "Guardar segredos com segurança. Nunca coloque essas informações em notas ou no assistente."],
  ["Arquivos", "Armazenamento privado com download e controle de versões pelo mesmo nome lógico.", "Guardar contratos, imagens, backups e documentos ligados ao projeto."],
  ["Modelos", "Estruturas prontas que geram projetos com tarefas e organização inicial.", "Criar projetos semelhantes com rapidez e um padrão de qualidade consistente."],
  ["Configurações", "Preferências do workspace, alertas e informações da conta.", "Ajustar funcionamento do Squire e escolher quando o sistema deve chamar sua atenção."],
  ["Notificações", "Avisos do navegador para eventos, reuniões e tarefas com lembrete configurado.", "Receber alertas no computador, tablet ou celular depois de permitir notificações para o Squire."],
  ["Visualização por modal", "Uma janela de consulta que mostra os detalhes sem levar você imediatamente para a edição.", "Consultar clientes, tarefas, notas e compromissos antes de decidir editar."],
];

export default async function HelpPage() {
  await requireWorkspace();

  return (
    <AppShell>
      <div className="content manual-page">
        <header className="manual-hero">
          <div className="manual-hero-icon" aria-hidden="true"><BrainCircuit size={26} /></div>
          <div>
            <div className="eyebrow">Guia de uso</div>
            <h1 className="page-title">Manual do Squire</h1>
            <p className="subtitle">Projetos, decisões e informações em ordem — do primeiro cadastro à entrega.</p>
          </div>
        </header>

        <nav className="manual-toc" aria-label="Atalhos do manual">
          <a href="#comecar"><Sparkles size={16} /> Começar</a>
          <a href="#contextos"><Network size={16} /> Contextos</a>
          <a href="#agenda"><Bell size={16} /> Agenda e avisos</a>
          <a href="#financeiro"><CircleDollarSign size={16} /> Financeiro</a>
          <a href="#memoria"><FileText size={16} /> Memória</a>
          <a href="#ia"><Bot size={16} /> Inteligência artificial</a>
          <a href="#seguranca"><ShieldCheck size={16} /> Segurança</a>
        </nav>

        <section className="manual-start" id="comecar" aria-labelledby="start-title">
          <div className="manual-section-heading">
            <span>COMECE AQUI</span>
            <h2 id="start-title">Seu primeiro fluxo em quatro passos</h2>
            <p>Siga esta ordem para que projetos, progresso e financeiro nasçam conectados.</p>
          </div>
          <ol className="manual-steps">
            {quickSteps.map(([Icon, title, description], index) => (
              <li key={title}>
                <div className="manual-step-number">{index + 1}</div>
                <div className="manual-step-icon" aria-hidden="true"><Icon size={20} /></div>
                <div><strong>{title}</strong><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="manual-tip">
          <Smartphone size={22} aria-hidden="true" />
          <div><strong>Rotina recomendada</strong><p>Comece pela página Início, marque os afazeres rápidos, consulte a Agenda e entre em um projeto somente quando precisar daquele contexto. No celular, as listagens ficam compactas, mas os detalhes continuam disponíveis ao tocar em cada item.</p></div>
        </aside>

        <section className="manual-chooser" aria-labelledby="chooser-title">
          <div className="manual-section-heading">
            <span>QUAL FUNÇÃO DEVO USAR?</span>
            <h2 id="chooser-title">Escolha pelo tipo de informação</h2>
            <p>Se estiver em dúvida sobre onde registrar algo, encontre abaixo a frase que melhor descreve sua situação.</p>
          </div>
          <div className="manual-choice-grid">
            {recordChoices.map(([Icon, name, when, example]) => (
              <article key={name}>
                <span aria-hidden="true"><Icon size={19} /></span>
                <div><h3>{name}</h3><p>{when}</p><small>Exemplo: {example}</small></div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel manual-directory" aria-labelledby="directory-title">
          <header className="manual-section-heading compact">
            <span>GUIA DE CADA TELA</span>
            <h2 id="directory-title">O que cada área faz e quando usar</h2>
            <p>Toque ou clique no nome de uma área para abrir sua explicação.</p>
          </header>
          <div className="manual-directory-list">
            {areas.map(([name, meaning, recommended], index) => (
              <details key={name} open={index === 0}>
                <summary><span>{name}</span><small>Ver explicação</small></summary>
                <div>
                  <p><strong>O que é:</strong> {meaning}</p>
                  <p><strong>Recomendado para:</strong> {recommended}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="manual-card-grid">
          {modules.map(({ id, icon: Icon, title, description, items }) => (
            <section className="panel manual-module" id={id} key={id} aria-labelledby={`${id}-title`}>
              <header>
                <span className="manual-module-icon" aria-hidden="true"><Icon size={20} /></span>
                <div><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
              </header>
              <div className="manual-list">
                {items.map(([name, text]) => <div className="manual-item" key={name}><strong>{name}</strong><p>{text}</p></div>)}
              </div>
            </section>
          ))}
        </div>

        <section className="panel manual-glossary" aria-labelledby="status-title">
          <header className="manual-section-heading compact">
            <span>LEITURA RÁPIDA</span>
            <h2 id="status-title">O que os principais status significam</h2>
          </header>
          <div className="manual-status-grid">
            {statuses.map(([name, meaning]) => <div key={name}><span>{name}</span><p>{meaning}</p></div>)}
          </div>
        </section>

        <section className="manual-safety" id="seguranca" aria-labelledby="safety-title">
          <div className="manual-safety-icon"><ShieldCheck size={24} /></div>
          <div>
            <h2 id="safety-title">Arquivar, excluir e proteger</h2>
            <p><strong>Arquive</strong> quando quiser retirar algo da rotina sem perder o histórico. <strong>Exclua</strong> somente registros inseridos por engano e após conferir suas relações. Senhas e tokens pertencem apenas ao cofre de Credenciais.</p>
          </div>
        </section>

        <section className="manual-shortcuts" aria-labelledby="shortcuts-title">
          <Search size={22} aria-hidden="true" />
          <div><h2 id="shortcuts-title">Encontre rápido</h2><p>Use a busca global no topo ou pressione <kbd>Ctrl</kbd> + <kbd>K</kbd>. No celular, abra o menu lateral pelo botão no cabeçalho.</p></div>
        </section>
      </div>
    </AppShell>
  );
}
