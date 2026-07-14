"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/app",
    label: "Bússola",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-2.5 5.5L7 17l2.5-5.5L15 9z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "/app/agenda",
    label: "Agenda",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2.5" />
        <path d="M4 9h16M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/app/tarefas",
    label: "Tarefas",
    icon: <path d="M5 6h14M5 12h14M5 18h9" />,
  },
  {
    href: "/app/voce",
    label: "Você",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5.5 20a6.5 6.5 0 0113 0" />
      </>
    ),
  },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.map((it) => {
        const on = it.href === "/app" ? path === "/app" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""}>
            <svg viewBox="0 0 24 24">{it.icon}</svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
