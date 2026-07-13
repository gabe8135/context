"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const sectionRoots = [
  "/app/assistente", "/app/agenda", "/app/arquivados", "/app/configuracoes",
  "/app/decisoes", "/app/entrada", "/app/financeiro", "/app/infraestrutura",
  "/app/modelos", "/app/notas", "/app/operacao", "/app/organizar",
  "/app/reunioes", "/app/tarefas",
];

export function ActiveNavLink({ href, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [targetPath, targetQuery = ""] = href.split("?");
  const targetParams = new URLSearchParams(targetQuery);
  const samePath = pathname === targetPath;
  const nestedSection = sectionRoots.some((root) => targetPath === root) && pathname.startsWith(`${targetPath}/`);
  const queryMatches = [...targetParams].every(([key, value]) => searchParams.get(key) === value);
  const active = (samePath && queryMatches) || (nestedSection && (!targetQuery || queryMatches));

  return <Link className={`nav-link${active ? " active" : ""}`} href={href} aria-current={active ? "page" : undefined}>{children}</Link>;
}
