"use client";

export function ConfirmSubmitButton({ children, message, className = "btn" }) {
  return <button className={className} type="submit" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
