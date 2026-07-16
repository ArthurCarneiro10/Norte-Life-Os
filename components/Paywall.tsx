"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Paywall({ status }: { status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assinar() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setError(d.error ?? "Não foi possível abrir o checkout.");
    } catch {
      setError("Falha de conexão.");
    }
    setLoading(false);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const canceled = status === "canceled";
  const pastDue = status === "past_due";

  return (
    <div className="paywall">
      <div className="pw-brand">NORTE</div>

      <h1 className="pw-title">
        {pastDue ? "Houve um problema no pagamento." : canceled ? "Sua assinatura terminou." : "Encontre seu norte."}
      </h1>
      <p className="pw-lead">
        {pastDue
          ? "Atualize seu cartão pra voltar a navegar com o Norte."
          : "Viva com direção, produza com equilíbrio. Um sistema operacional pra sua vida — não só mais uma lista de tarefas."}
      </p>

      <div className="pw-card">
        <div className="pw-price">
          R$ 39<span>/mês</span>
        </div>
        <ul className="pw-list">
          <li>Briefing diário que diz o que importa agora</li>
          <li>Prioridade única no seu pico de energia</li>
          <li>Agenda com janelas livres e antecipação</li>
          <li>Focus Flow, cascata de etapas e previsão de entrega</li>
          <li>Alerta de custo de oportunidade — protege sua vida</li>
        </ul>
        <button className="pw-btn" onClick={assinar} disabled={loading}>
          {loading ? "Abrindo checkout..." : pastDue ? "Atualizar pagamento" : "Assinar o Norte"}
        </button>
        {error && <p className="pw-error">{error}</p>}
        <p className="pw-note">Cancele quando quiser. Pagamento seguro via Stripe.</p>
      </div>

      <button className="pw-logout" onClick={logout}>
        Sair
      </button>
    </div>
  );
}
