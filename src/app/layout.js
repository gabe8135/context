import "./globals.css";
import "./crud.css";
import "./project-nav.css";
import "./layout-fixes.css";
import "./theme-polish.css";
import { PwaRegister } from "@/components/pwa-register";
import { ConnectionStatus } from "@/components/connection-status";

export const metadata = {
  title: { default: "Contexto — memória operacional", template: "%s · Contexto" },
  description: "Organize tarefas, decisões, finanças e infraestrutura sem procurar em páginas intermináveis.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body><PwaRegister/><ConnectionStatus/>{children}</body></html>;
}
