export const SMART_TEMPLATE_INFO = [
  ["site_institucional", "Site institucional", "30 dias", "Escopo, conteúdo, design, desenvolvimento e publicação."],
  ["landing_page", "Landing page", "14 dias", "Oferta, copy, conversão, métricas e publicação."],
  ["migracao_hospedagem", "Migração de hospedagem", "10 dias", "Inventário, backup, homologação, DNS e validação."],
];

export const SMART_TEMPLATES = {
  site_institucional: {
    name: "Site institucional",
    description: SMART_TEMPLATE_INFO[0][3],
    duration: 30,
    tasks: ["Confirmar escopo e objetivos", "Reunir conteúdo e acessos", "Aprovar arquitetura e layout", "Desenvolver páginas", "Validar responsividade e formulários", "Publicar e acompanhar"],
  },
  landing_page: {
    name: "Landing page",
    description: SMART_TEMPLATE_INFO[1][3],
    duration: 14,
    tasks: ["Definir oferta e conversão principal", "Reunir copy e referências", "Aprovar wireframe", "Desenvolver landing page", "Configurar formulários e métricas", "Validar e publicar"],
  },
  migracao_hospedagem: {
    name: "Migração de hospedagem",
    description: SMART_TEMPLATE_INFO[2][3],
    duration: 10,
    tasks: ["Inventariar domínio, DNS, e-mails e hospedagem", "Gerar e validar backup completo", "Preparar ambiente de destino", "Homologar site no endereço temporário", "Executar troca de DNS", "Validar SSL, formulários e e-mails", "Monitorar propagação e estabilidade"],
  },
};
