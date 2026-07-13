"use client";
import { useEffect,useRef } from "react";import{Search}from"lucide-react";
export function GlobalSearch(){const ref=useRef(null);useEffect(()=>{const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();ref.current?.focus()}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[]);return <form className="search" action="/app/busca"><Search size={14}/><input ref={ref} name="q" aria-label="Busca global" placeholder="Buscar tudo...  Ctrl K" required/></form>}
