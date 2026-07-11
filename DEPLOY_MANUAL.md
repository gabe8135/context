# Publicação manual

Este projeto não executa deploy automaticamente. O proprietário escolhe como versionar e publicar.

## Preparação local

```powershell
npm install
npm run predeploy
npm run verify
```

## Configuração do projeto de hospedagem

- Framework: Next.js.
- Diretório raiz: raiz deste projeto.
- Install Command: `npm install` ou `pnpm install --frozen-lockfile`.
- Build Command: `npm run build`.
- Output Directory: padrão do Next.js; não preencher manualmente.
- Node.js: versão LTS compatível com Next.js 16.

Cadastre as três variáveis descritas em `PRE_DEPLOY_CHECKLIST.md`. Não envie `.env.local`.

## Depois da primeira publicação

Copie a URL pública, configure Site URL e Redirect URLs no Supabase e faça uma nova publicação somente se a plataforma exigir rebuild. Em seguida execute os 11 testes manuais do checklist.

## Rollback

Se autenticação, dados, upload ou cofre falharem, não continue alimentando o sistema. Retorne à última versão funcional pela própria plataforma e corrija localmente antes de publicar novamente.
