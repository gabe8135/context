"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MobileSidebarController() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-sidebar-open", open);
    return () => document.documentElement.classList.remove("mobile-sidebar-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    const sidebar = document.getElementById("app-sidebar");
    const closeAfterNavigation = (event) => {
      if (event.target.closest("a")) setOpen(false);
    };
    sidebar?.addEventListener("click", closeAfterNavigation);
    return () => sidebar?.removeEventListener("click", closeAfterNavigation);
  }, []);

  const backdrop = <button
    className="sidebar-backdrop"
    type="button"
    aria-label="Fechar menu principal clicando fora"
    tabIndex={open ? 0 : -1}
    onClick={() => setOpen(false)}
  />;

  return <>
    <button
      className="mobile-menu-button"
      type="button"
      aria-label={open ? "Fechar menu principal" : "Abrir menu principal"}
      aria-controls="app-sidebar"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X size={21}/> : <Menu size={21}/>}<span>Menu</span>
    </button>
    {mounted && createPortal(backdrop, document.body)}
  </>;
}
