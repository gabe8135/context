"use client";

import { useEffect } from "react";

const NOTICE_SELECTOR = ".success-note, .temporary-notice";
const URL_NOTICE_KEYS = ["sucesso", "erro", "mensagem"];

export function AutoDismissNotices({ delay = 4200 }) {
  useEffect(() => {
    const notices = [...document.querySelectorAll(NOTICE_SELECTOR)];
    if (!notices.length) return;

    const timer = window.setTimeout(() => {
      notices.forEach((notice) => {
        notice.classList.add("notice-leaving");
        window.setTimeout(() => notice.remove(), 240);
      });

      const url = new URL(window.location.href);
      let changed = false;
      URL_NOTICE_KEYS.forEach((key) => {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay]);

  return null;
}
