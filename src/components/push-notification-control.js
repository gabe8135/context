"use client";

import { Bell, BellOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const decode = (value) => {
  const pad = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

export function PushNotificationControl({ global = false }) {
  const pathname = usePathname();
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function inspectSubscription() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "enabled" : "disabled");
    }
    inspectSubscription().catch(() => setState("disabled"));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      if (!window.isSecureContext) throw new Error("As notificações exigem uma conexão HTTPS.");
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error("A chave pública de notificações não está configurada.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "disabled");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decode(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Não foi possível registrar este dispositivo.");
      }
      setState("enabled");
      setMessage("Este dispositivo receberá os lembretes da sua agenda.");
    } catch (error) {
      setMessage(error.message);
      setState(Notification.permission === "denied" ? "blocked" : "disabled");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setState("disabled");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || (global && (state === "enabled" || pathname === "/app/agenda"))) return null;
  if (state === "unsupported") return global ? null : <p className="meta">Este navegador não oferece notificações push.</p>;

  const button = <button
    className={`btn${state === "enabled" ? " notification-enabled" : ""}`}
    type="button"
    disabled={busy || state === "blocked"}
    onClick={state === "enabled" ? disable : enable}
  >
    {state === "enabled" ? <BellOff size={16}/> : <Bell size={16}/>}
    {state === "enabled" ? "Desativar notificações" : state === "blocked" ? "Permissão bloqueada" : busy ? "Configurando…" : "Permitir notificações"}
  </button>;

  if (!global) return <div className="notification-control">{button}{message && <span className="meta">{message}</span>}</div>;

  return <aside className={`notification-prompt${state === "blocked" ? " blocked" : ""}`} role="status">
    <span className="notification-prompt-icon"><Bell size={19}/></span>
    <div>
      <b>{state === "blocked" ? "Notificações bloqueadas neste navegador" : "Receba seus lembretes no horário certo"}</b>
      <span>{state === "blocked" ? "Libere as notificações nas configurações do site e recarregue a página." : "Ative uma vez para receber tarefas, reuniões e compromissos neste dispositivo."}</span>
      {message && <span className="notification-error">{message}</span>}
    </div>
    {button}
  </aside>;
}
