"use client";

import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { AgendaItemDetailsModal } from "./agenda-item-details-modal";

const dayKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function AgendaCalendar({ items, month, onMonthChange, loading = false, full = false }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const date = month || new Date();
  const grouped = useMemo(() => items.reduce((result, item) => {
    (result[dayKey(item.at)] ||= []).push(item);
    return result;
  }, {}), [items]);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  const upcoming = selectedDay
    ? grouped[selectedDay] || []
    : items.filter((item) => new Date(item.at) >= new Date()).slice(0, full ? 12 : 6);
  const moveMonth = (amount) => onMonthChange?.(new Date(date.getFullYear(), date.getMonth() + amount, 1));

  return <>
    <div className={`agenda-board${full ? " full" : ""}`}>
      <section className="agenda-upcoming">
        <div className="agenda-section-head">
          <div>
            <span className="eyebrow">{selectedDay ? "Compromissos do dia" : "Próximos compromissos"}</span>
            <h3>{selectedDay ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "Sua agenda"}</h3>
          </div>
          <span className="badge">{upcoming.length}</span>
        </div>
        <div className="agenda-event-list">
          {upcoming.map((item) => <button type="button" className="agenda-event" key={item.id} onClick={() => setSelectedItem(item)}>
            <span className={`agenda-event-mark ${item.type}`}/>
            <div>
              <b>{item.title}</b>
              <span><Clock3 size={13}/>{new Date(item.at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              {item.project && <span><MapPin size={13}/>{item.project}</span>}
            </div>
          </button>)}
          {!upcoming.length && <div className="empty">Nenhum compromisso para exibir.</div>}
        </div>
      </section>
      <section className="agenda-month">
        <div className="agenda-month-head">
          <button className="icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="Mês anterior"><ChevronLeft/></button>
          <div><span className="eyebrow">Agenda mensal</span><h3>{date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3></div>
          <button className="icon-button" type="button" onClick={() => moveMonth(1)} aria-label="Próximo mês"><ChevronRight/></button>
        </div>
        <div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => <span key={label}>{label}</span>)}</div>
        <div className="calendar-grid">{cells.map((day, index) => {
          if (!day) return <span className="calendar-day empty-day" key={`empty-${index}`}/>;
          const key = `${monthKey(date)}-${String(day).padStart(2, "0")}`;
          const count = grouped[key]?.length || 0;
          return <button type="button" key={day} className={`calendar-day${count ? " has-items" : ""}${selectedDay === key ? " selected" : ""}`} onClick={() => setSelectedDay(selectedDay === key ? null : key)}>
            <span>{day}</span>{count > 0 && <b>{count}</b>}
          </button>;
        })}</div>
        {loading && <p className="meta">Atualizando agenda…</p>}
      </section>
    </div>
    {selectedItem && <AgendaItemDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)}/>}
  </>;
}
