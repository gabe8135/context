"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ResponsiveTables() {
  const pathname = usePathname();

  useEffect(() => {
    const applyLabels = () => {
      document.querySelectorAll(".data-panel table").forEach((table) => {
        const labels = [...table.querySelectorAll("thead th")].map((header) => header.textContent.trim() || "Informação");
        table.querySelectorAll("tbody tr").forEach((row) => {
          [...row.children].forEach((cell, index) => cell.setAttribute("data-label", labels[index] || "Informação"));
        });
      });
    };

    applyLabels();
    const frame = requestAnimationFrame(applyLabels);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
