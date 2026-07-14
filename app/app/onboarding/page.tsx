"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHRONO = [
  { k: "Manhã cedo", s: "06:30", e: "08:30", ic: "🌅" },
  { k: "Meio da manhã", s: "09:00", e: "11:00", ic: "☀️" },
  { k: "Fim de tarde", s: "16:00", e: "18:30", ic: "🌇" },
  { k: "Noite", s: "20:00", e: "22:30", ic: "🌙" },
];
const NORTES = [
  { t: "Avançar uma entrega de trabalho", ic: "💼" },
  { t: "Manter o ritmo dos estudos", ic: "📚" },
  { t: "Cuidar da saúde e do equilíbrio", ic: "🌿" },
  { t: "Empurrar um projeto pessoal", ic: "🚀" },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [chrono, setChrono] = useState<(typeof CHRONO)[number] | null>(null);
  const [north, setNorth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function finish(selectedNorth: string) {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        chronotype_start: chrono?.s ?? null,
        chronotype_end: chrono?.e ?? null,
        north: selectedNorth,
      })
      .eq("id", user.id);
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="obwrap">
      {/* progresso */}
      <div className="ob-steps">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`ob-dot ${i <= step ? "on" : ""}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="brand">NORTE</div>
          <div className="q">Vamos calibrar seu norte.</div>
          <p className="lead">Três perguntas rápidas pra deixar tudo com a sua cara. Como te chamamos?</p>
          <input
            className="field"
            placeholder="Seu nome"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setStep(1)}
          />
          <button className="btn ink" onClick={() => setStep(1)}>
            Começar
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="ob-kick">Passo 02 · Energia</div>
          <div className="q">Quando sua mente rende mais?</div>
          <p className="lead">O Norte reserva seu trabalho difícil pro seu pico.</p>
          <div className="ob-opts">
            {CHRONO.map((c) => (
              <button
                key={c.k}
                className={`ob-opt ${chrono?.k === c.k ? "sel" : ""}`}
                onClick={() => {
                  setChrono(c);
                  setTimeout(() => setStep(2), 200);
                }}
              >
                <span className="ob-ic">{c.ic}</span>
                <span>
                  <span className="ob-t">{c.k}</span>
                  <span className="ob-s">
                    {c.s} – {c.e}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="ob-kick">Passo 03 · Seu norte</div>
          <div className="q">O que mais importa agora?</div>
          <p className="lead">Uma direção pra esta temporada. Muda quando quiser.</p>
          <div className="ob-opts">
            {NORTES.map((n) => (
              <button
                key={n.t}
                className={`ob-opt ${north === n.t ? "sel" : ""}`}
                disabled={saving}
                onClick={() => {
                  setNorth(n.t);
                  finish(n.t);
                }}
              >
                <span className="ob-ic">{n.ic}</span>
                <span className="ob-t">{n.t}</span>
              </button>
            ))}
          </div>
          {saving && <p className="note">Traçando seu rumo...</p>}
        </>
      )}
    </div>
  );
}
