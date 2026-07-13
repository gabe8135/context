"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

const DRAFT = "squire:organizar:draft";

export function NaturalCapture({ projectSlug = "" }) {
  const router = useRouter();
  const [text, setText] = useState("");

  function organize() {
    if (!text.trim()) return;
    localStorage.setItem(DRAFT, text.trim());
    router.push(`/app/organizar${projectSlug ? `?projeto=${projectSlug}` : ""}`);
  }

  return <section className="natural-capture" aria-labelledby="capture-title">
    <div className="natural-capture-copy">
      <span className="capture-icon"><Sparkles size={17}/></span>
      <div><h2 id="capture-title">O que está na sua cabeça?</h2><p>Escreva ou cole sem organizar. A IA propõe os lugares certos e você confirma.</p></div>
    </div>
    <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") organize(); }} rows="3" placeholder="Ex.: preciso enviar a proposta amanhã, o cliente aprovou o layout e pagou a entrada…"/>
    <div className="natural-capture-actions"><small>Ctrl + Enter para organizar</small><button className="btn primary" type="button" disabled={!text.trim()} onClick={organize}>Organizar <ArrowRight size={15}/></button></div>
  </section>;
}
