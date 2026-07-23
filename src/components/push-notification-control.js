"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const decode = (value) => {
  const pad = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const sameKey = (subscription, publicKey) => {
  const current = subscription?.options?.applicationServerKey;
  if (!current || !publicKey) return false;
  const expected = decode(publicKey);
  const received = new Uint8Array(current);
  return expected.length === received.length && expected.every((value, index) => value === received[index]);
};

async function saveSubscription(subscription) {
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Não foi possível registrar este dispositivo.");
  }
}

async function removeSubscription(subscription) {
  await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
  await subscription.unsubscribe();
}

export function PushNotificationControl({ global = false }) {
  const pathname = usePathname();
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
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
      if (Notification.permission !== "granted") {
        setState("disabled");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setMessage("A chave pública de notificações não está configurada.");
        setState("disabled");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState("disabled");
        return;
      }
      if (!sameKey(subscription, publicKey)) {
        await removeSubscription(subscription);
        setMessage("A configuração de segurança mudou. Ative novamente as notificações.");
        setState("disabled");
        return;
      }
      await saveSubscription(subscription);
      setState("enabled");
    }
    inspectSubscription().catch((error) => {
      setMessage(error.message || "Não foi possível validar a inscrição deste dispositivo.");
      setState(Notification.permission === "denied" ? "blocked" : "disabled");
    });
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      if (!window.isSecureContext) throw new Error("As notificações exigem HTTPS ou localhost.");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("A chave pública de notificações não está configurada.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "disabled");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, publicKey)) {
        await removeSubscription(subscription);
        subscription = null;
      }
      subscription ||= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decode(publicKey),
      });
      await saveSubscription(subscription);
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
      if (subscription) await removeSubscription(subscription);
      setState("disabled");
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "O teste de notificação falhou.");
      setMessage("Notificação de teste enviada. Ela deve aparecer em alguns segundos.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTesting(false);
    }
  }

  if (state === "loading" || (global && (state === "enabled" || pathname === "/app/agenda"))) return null;
  if (state === "unsupported") return global ? null : <p className="meta">Este navegador não oferece notificações push.</p>;

  const toggleButton = <button
    className={`btn${state === "enabled" ? " notification-enabled" : ""}`}
    type="button"
    disabled={busy || state === "blocked"}
    onClick={state === "enabled" ? disable : enable}
  >
    {state === "enabled" ? <BellOff size={16}/> : <Bell size={16}/>}
    {state === "enabled" ? "Desativar notificações" : state === "blocked" ? "Permissão bloqueada" : busy ? "Configurando…" : "Permitir notificações"}
  </button>;

  const testButton = state === "enabled" && <button className="btn" type="button" disabled={testing} onClick={testNotification}>
    <Send size={16}/> {testing ? "Enviando…" : "Testar notificação"}
  </button>;

  const visibleMessage = message || (state === "blocked" ? "Abra as permissões deste site no navegador, permita notificações e recarregue a página." : "");

  if (!global) return <div className="notification-control">
    {toggleButton}{testButton}{visibleMessage && <span className="meta">{visibleMessage}</span>}
  </div>;

  return <aside className={`notification-prompt${state === "blocked" ? " blocked" : ""}`} role="status">
    <span className="notification-prompt-icon"><Bell size={19}/></span>
    <div>
      <b>{state === "blocked" ? "Notificações bloqueadas neste navegador" : "Receba seus lembretes no horário certo"}</b>
      <span>{state === "blocked" ? "Libere as notificações nas configurações do site e recarregue a página." : "Ative uma vez para receber tarefas, reuniões e compromissos neste dispositivo."}</span>
      {message && <span className="notification-error">{message}</span>}
    </div>
    {toggleButton}
  </aside>;
}
