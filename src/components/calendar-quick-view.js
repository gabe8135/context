"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function CalendarQuickView() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [items, setItems] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const escape = (event) => event.key === "Escape" && setOpen(false);
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", escape);
    return () => { document.documentElement.classList.remove("modal-open"); window.removeEventListener("keydown", escape); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/agenda-summary?month=${monthKey(month)}`).then((response) => response.json()).then((data) => { setItems(data.items || []); setSelectedDay(null); }).finally(() => setLoading(false));
  }, [open, month]);

  const itemsByDay = useMemo(() => items.reduce((map, item) => { const key = dayKey(new Date(item.at)); (map[key] ||= []).push(item); return map; }, {}), [items]);
  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedItems = selectedDay ? itemsByDay[selectedDay] || [] : [];

  const modal = open ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="app-modal calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title"><header className="modal-head"><div><span className="eyebrow">Agenda mensal</span><h2 id="calendar-title">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Fechar agenda"><X size={20}/></button></header><div className="calendar-controls"><button className="icon-button" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior"><ChevronLeft size={19}/></button><span>{loading ? "Carregando…" : `${items.length} compromisso(s)`}</span><button className="icon-button" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês"><ChevronRight size={19}/></button></div><div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => day ? <button key={day} type="button" className={`calendar-day${itemsByDay[dayKey(new Date(month.getFullYear(), month.getMonth(), day))]?.length ? " has-items" : ""}${selectedDay === dayKey(new Date(month.getFullYear(), month.getMonth(), day)) ? " selected" : ""}`} onClick={() => setSelectedDay(dayKey(new Date(month.getFullYear(), month.getMonth(), day)))}><span>{day}</span>{itemsByDay[dayKey(new Date(month.getFullYear(), month.getMonth(), day))]?.length ? <b>{itemsByDay[dayKey(new Date(month.getFullYear(), month.getMonth(), day))].length}</b> : null}</button> : <span className="calendar-day empty-day" key={`empty-${index}`}/>)}</div><div className="calendar-details">{selectedDay ? <><h3>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>{selectedItems.length ? selectedItems.map((item) => <div className="calendar-item" key={item.id}><div><b>{item.title}</b><p>{item.description || "Sem descrição."}</p><small>{new Date(item.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{item.project ? ` · ${item.project}` : ""}{item.meta ? ` · ${item.meta}` : ""}</small></div><Link className="btn" href={item.href}>Abrir</Link></div>) : <p className="meta">Nenhum item neste dia.</p>}</> : <p className="meta">Selecione um dia destacado para ver todos os detalhes.</p>}</div><footer className="modal-actions"><Link className="btn" href="/app/agenda">Abrir agenda completa</Link><button className="btn" type="button" onClick={() => setOpen(false)}>Fechar</button></footer></section></div> : null;

  return <><button className="btn" type="button" onClick={() => setOpen(true)}><CalendarDays size={14}/> Agenda</button>{open && createPortal(modal, document.body)}</>;
}
