"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  name: string | null;
  north: string | null;
  chronotype_start: string | null;
  chronotype_end: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
}

const CHRONO_LABEL: Record<string, string> = {
  "06:30": "Manhã cedo",
  "09:00": "Meio da manhã",
  "16:00": "Fim de tarde",
  "20:00": "Noite",
};

export default function VocePage() {
  const router = useRouter();
  const supabase = createClient();
  const [p, setP] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [done, setDone] = useState(0);
  const [focusMin, setFocusMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setEmail(user.email ?? "");

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: prof }, { count: doneCount }, { data: sessions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("name,north,chronotype_start,chronotype_end,subscription_status,trial_ends_at,created_at")
          .eq("id", user.id)
          .single(),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "finalizado")
          .gte("completed_at", weekAgo),
        supabase.from("focus_sessions").select("planned_minutes").gte("started_at", weekAgo),
      ]);

      setP((prof as Profile) ?? null);
      setDone(doneCount ?? 0);
      setFocusMin(
        ((sessions as { planned_minutes: number | null }[]) ?? []).reduce(
          (a, s) => a + (s.planned_minutes ?? 0),
          0
        )
      );
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function excluirConta() {
    if (!confirm("Excluir sua conta e TODOS os seus dados? Isso não pode ser desfeito.")) return;
    if (!confirm("Tem certeza mesmo? Tarefas, agenda e histórico serão apagados para sempre.")) return;
    setDeleting(true);
    const r = await fetch("/api/account/delete", { method: "POST" });
    const d = await r.json();
    setDeleting(false);
    if (d.deleted) {
      router.push("/login");
      router.refresh();
    } else {
      alert("Não foi possível excluir agora. Tente de novo ou escreva pra gente.");
    }
  }

  if (loading) {
    return (
      <div className="scroll">
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 20 }}>Carregando...</p>
      </div>
    );
  }

  const name = p?.name?.split(" ")[0] ?? email.split("@")[0];
  const nameCap = name.charAt(0).toUpperCase() + name.slice(1);
  const since = p?.created_at
    ? new Date(p.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "hoje";

  // plano / trial
  const status = p?.subscription_status ?? "trialing";
  const trialEnds = p?.trial_ends_at ? new Date(p.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - Date.now()) / 86400000) : 0;
  const isActive = status === "active";
  const trialOver = !isActive && daysLeft <= 0;

  const chronoLabel = p?.chronotype_start
    ? `${CHRONO_LABEL[p.chronotype_start.slice(0, 5)] ?? "Personalizado"} · ${p.chronotype_start.slice(0, 5)}–${p.chronotype_end?.slice(0, 5)}`
    : null;

  return (
    <div className="scroll">
      <div className="vhead">
        <div className="wm">
          <span className="tick" />
          NORTE
        </div>
        <div className="datestr">PILOTO</div>
      </div>

      <div className="avatar">{nameCap.charAt(0)}</div>
      <div className="voce-name">{nameCap}</div>
      <div className="voce-role">Piloto desde {since}</div>

      {/* PLANO */}
      <div className="sec">
        Seu plano<span className="rule" />
      </div>
      <div className={`plan ${isActive ? "active" : trialOver ? "over" : "trial"}`}>
        <div className="plan-top">
          <span className="plan-name">{isActive ? "Norte · assinante" : "Período de teste"}</span>
          {isActive ? (
            <span className="plan-badge ok">ativo</span>
          ) : trialOver ? (
            <span className="plan-badge over">encerrado</span>
          ) : (
            <span className="plan-badge">{daysLeft}d restantes</span>
          )}
        </div>
        <p className="plan-sub">
          {isActive
            ? "Obrigado por navegar com o Norte. Renova automaticamente."
            : trialOver
            ? "Seu teste terminou. Assine pra manter o briefing diário e a bússola."
            : `Você tem acesso completo por mais ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}.`}
        </p>
        {!isActive && (
          <button className="plan-btn" onClick={() => alert("Em breve: assinatura R$ 39/mês")}>
            Assinar · R$ 39/mês
          </button>
        )}
      </div>

      {/* CALIBRAÇÃO */}
      <div className="sec">
        Sua calibração<span className="rule" />
      </div>
      <Link href="/app/onboarding" className="prow">
        <div className="pi">🎯</div>
        <div>
          <div className="pk">Seu norte</div>
          <div className="pv">{p?.north ?? "Não definido"}</div>
        </div>
        <span className="pedit">trocar</span>
      </Link>
      <Link href="/app/onboarding" className="prow">
        <div className="pi">⚡</div>
        <div>
          <div className="pk">Pico de energia</div>
          <div className="pv">{chronoLabel ?? "Não calibrado"}</div>
        </div>
        <span className="pedit">ajustar</span>
      </Link>
      <Link href="/app/agenda" className="prow">
        <div className="pi">📅</div>
        <div>
          <div className="pk">Agenda</div>
          <div className="pv">Manual · sync em breve</div>
        </div>
        <span className="pedit">ver</span>
      </Link>

      {/* SEMANA */}
      <div className="sec" style={{ marginTop: 18 }}>
        Esta semana<span className="rule" />
      </div>
      <div className="prow">
        <div className="pi">✅</div>
        <div>
          <div className="pk">Tarefas concluídas</div>
          <div className="pv">{done}</div>
        </div>
      </div>
      <div className="prow">
        <div className="pi">◐</div>
        <div>
          <div className="pk">Tempo em foco</div>
          <div className="pv">
            {focusMin >= 60 ? `${Math.floor(focusMin / 60)}h${focusMin % 60 ? String(focusMin % 60).padStart(2, "0") : ""}` : `${focusMin}min`}
          </div>
        </div>
      </div>

      {/* CONTA */}
      <div className="sec" style={{ marginTop: 18 }}>
        Conta<span className="rule" />
      </div>
      <div className="prow">
        <div className="pi">✉️</div>
        <div>
          <div className="pk">E-mail</div>
          <div className="pv" style={{ fontSize: 13 }}>{email}</div>
        </div>
      </div>
      <button className="prow logout" onClick={logout}>
        <div className="pi">↩</div>
        <div>
          <div className="pv">Sair do Norte</div>
        </div>
      </button>

      {/* rodapé discreto: direitos LGPD + documentos */}
      <div className="footlinks">
        <a href="/api/account/export">Exportar meus dados</a>
        <span>·</span>
        <a href="/privacidade">Privacidade</a>
        <span>·</span>
        <a href="/termos">Termos</a>
        <span>·</span>
        <button onClick={excluirConta} disabled={deleting} className="footdanger">
          {deleting ? "Excluindo..." : "Excluir conta"}
        </button>
      </div>

      <p className="voce-foot">NORTE · SISTEMA OPERACIONAL PESSOAL</p>
    </div>
  );
}