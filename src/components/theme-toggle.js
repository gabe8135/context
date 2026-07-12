"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const colors = { dark: "#090e16", light: "#f5f7fa" };

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
    const theme = localStorage.getItem("contexto-theme") === "dark" ? "dark" : "light";
    setDark(theme === "dark");
    applyTheme(theme);
  }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    setDark(next === "dark");
    applyTheme(next);
    localStorage.setItem("contexto-theme", next);
  }
  return <button className="theme" onClick={toggle} aria-label="Alternar tema">{dark ? <Sun size={16}/> : <Moon size={16}/>}</button>;
}
