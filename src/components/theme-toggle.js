"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const colors = { dark: "#08111f", light: "#f5f1e8" };

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = colors[theme];
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const theme = (localStorage.getItem("squire-theme") || localStorage.getItem("contexto-theme")) === "dark" ? "dark" : "light";
    setDark(theme === "dark");
    applyTheme(theme);
  }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    setDark(next === "dark");
    applyTheme(next);
    localStorage.setItem("squire-theme", next);
  }
  return <button className="theme" onClick={toggle} aria-label="Alternar tema">{dark ? <Sun size={16}/> : <Moon size={16}/>}</button>;
}
