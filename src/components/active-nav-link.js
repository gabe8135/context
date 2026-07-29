"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [currentHash, setCurrentHash] = useState("");
  const [hrefWithoutHash, targetHash = ""] = href.split("#");
  const [targetPath, targetQuery = ""] = hrefWithoutHash.split("?");
  const targetParams = new URLSearchParams(targetQuery);
  const samePath = pathname === targetPath;
  const nestedSection = sectionRoots.some((root) => targetPath === root) && pathname.startsWith(`${targetPath}/`);
  const queryMatches = [...targetParams].every(([key, value]) => searchParams.get(key) === value);
  const hashMatches = targetHash ? currentHash === `#${targetHash}` : !currentHash;
  const active = ((samePath && queryMatches) || (nestedSection && (!targetQuery || queryMatches))) && hashMatches;

  useEffect(() => {
    function syncHash(event) {
      setCurrentHash(event?.detail ?? window.location.hash);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    window.addEventListener("squire:hash-navigation", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
      window.removeEventListener("squire:hash-navigation", syncHash);
    };
  }, [pathname]);

  function navigateSection() {
    const nextHash = targetHash ? `#${targetHash}` : "";
    window.dispatchEvent(new CustomEvent("squire:hash-navigation", { detail: nextHash }));
    requestAnimationFrame(() => {
      if (targetHash) document.getElementById(targetHash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (samePath) window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return <Link className={`nav-link${active ? " active" : ""}`} href={href} onClick={navigateSection} aria-current={active ? "page" : undefined}>{children}</Link>;
}
