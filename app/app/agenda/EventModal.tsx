"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Sphere } from "@/types/db";

export function EventModal({
  day,
  onClose,
  onCreated,
}: {
  day: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const iso = day.toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [sphere, setSphere] = useState<Sphere>("profissional");
  const [date, setDate] = useState(iso);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!title.trim()) return setError("Dê um título ao compromisso.");
    const s = new Date(`${date}T${start}:00`);
    const e = new Date(`${date}T${end}:00`);
    if (e <= s) return setError("O fim precisa ser depois do início.");

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      source: "norte",
      sphere,
      title: title.trim(),
      starts_at: s.toISOString(),
      ends_at: e.toISOString(),
      is_fixed: true,
      status: "confirmed",
    });
    setLoading(false);
    if (error) return setError(error.message);
    onCreated();
    onClose();
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(ev) => ev.stopPropagation()}>
        <div style={handle} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Novo compromisso</div>

        <input
          className="field"
          style={{ margin: "0 0 12px" }}
          placeholder="Reunião, aula, consulta..."
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />

        <label style={lbl}>Esfera</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["profissional", "pessoal"] as Sphere[]).map((sp) => (
            <button
              key={sp}
              onClick={() => setSphere(sp)}
              style={{
                ...seg,
                borderColor: sphere === sp ? "var(--gold)" : "var(--line-2)",
                background: sphere === sp ? "var(--gold-bg)" : "var(--surface)",
                color: sphere === sp ? "var(--gold)" : "var(--ink-2)",
              }}
            >
              {sp === "profissional" ? "Profissional" : "Pessoal"}
            </button>
          ))}
        </div>

        <label style={lbl}>Data</label>
        <input
          className="field"
          style={{ margin: "0 0 12px" }}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Início</label>
            <input className="field" style={{ margin: 0 }} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Fim</label>
            <input className="field" style={{ margin: 0 }} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        {error && <p style={{ color: "var(--coral)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn" style={{ background: "var(--sunk)", color: "var(--ink-2)" }} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn ink" onClick={create} disabled={loading}>
            {loading ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(40,35,25,.35)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  zIndex: 100,
};
const sheet: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "var(--paper)",
  borderRadius: "22px 22px 0 0",
  padding: "14px 20px 26px",
  boxShadow: "0 -20px 60px -20px rgba(0,0,0,.35)",
  animation: "riseUp .25s ease",
};
const handle: React.CSSProperties = {
  width: 38,
  height: 4,
  borderRadius: 99,
  background: "var(--line-2)",
  margin: "0 auto 16px",
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  marginBottom: 7,
};
const seg: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: 10,
  border: "1.5px solid",
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
