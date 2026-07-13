import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const notices = [];
const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "next.config.mjs",
  "public/manifest.webmanifest",
  "public/sw.js",
  "supabase/migrations/202607100001_initial_context.sql",
  "supabase/migrations/202607110005_files_storage.sql",
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Arquivo obrigatório ausente: ${file}`);
}

const envPath = resolve(root, ".env.local");
if (!existsSync(envPath)) failures.push(".env.local ausente");
else {
  const envText = readFileSync(envPath, "utf8");
  const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "CREDENTIALS_ENCRYPTION_KEY", "GROQ_API_KEY"];
  for (const name of requiredEnv) {
    const match = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
    if (!match || !match[1].trim()) failures.push(`Variável ausente: ${name}`);
  }
  const vault = envText.match(/^CREDENTIALS_ENCRYPTION_KEY=(.+)$/m)?.[1]?.trim();
  if (vault && !/^[a-f\d]{64}$/i.test(vault) && Buffer.from(vault, "base64").length !== 32) failures.push("CREDENTIALS_ENCRYPTION_KEY possui formato inválido");
}

const gitignore = existsSync(resolve(root, ".gitignore")) ? readFileSync(resolve(root, ".gitignore"), "utf8") : "";
if (!/^\.env\.local$/m.test(gitignore) && !/^\.env\.\*$/m.test(gitignore) && !/^\.env\*$/m.test(gitignore)) failures.push(".env.local não está protegido pelo .gitignore");

notices.push("Configurar as 4 variáveis de ambiente também na plataforma de hospedagem.");
notices.push("Configurar Site URL e Redirect URLs no Supabase após conhecer o domínio.");
notices.push("Executar npm run verify antes de publicar.");

console.log("\nContexto — verificação pré-deploy\n");
for (const notice of notices) console.log(`AVISO: ${notice}`);
if (failures.length) {
  for (const failure of failures) console.error(`ERRO: ${failure}`);
  process.exit(1);
}
console.log("\nOK: estrutura local e variáveis obrigatórias estão prontas para o deploy manual.");
