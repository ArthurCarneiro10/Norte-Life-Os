# Norte

Sistema operacional pessoal — direção, clareza e equilíbrio. Não é um task manager; é um gestor de capacidade humana.

Este repositório é o **esqueleto real do MVP** (não protótipo): Next.js 14 + Supabase, com o modelo de dados que carrega todas as decisões de produto. Compila com `tsc` limpo e passa no `next build`.

## O que já está pronto aqui

- **Schema de produção** (`supabase/migrations/0001_init.sql`): esferas Pessoal/Profissional, o modelo de evento normalizado com a distinção `is_fixed` (fixo vs. flexível — a base de toda a inteligência), tarefas, sub-etapas com dependência (cascata), alertas, sessões de foco, e ganchos para carga cognitiva. RLS completo (cada usuário só vê o que é seu) e trigger que cria o profile no cadastro.
- **Motor determinístico** (`lib/engine.ts`): união de intervalos, conflitos duros, janelas livres (tempo líquido), ranking por cronotipo, previsão de entrega e alerta preditivo de cascata. **Sem IA** — é isto que mantém o custo por usuário baixo. Conflito também roda nativo no Postgres via índice GiST (`conflicts_for_day`).
- **Auth** por link mágico (Supabase), middleware protegendo `/app/*`.
- **Fluxo real Tarefas → Card** ligado ao banco: lista com agrupamento (por etapa / por cliente) e o card rico com sub-etapas em cascata, alerta preditivo e snapshot "Onde parei?". Marcar uma etapa grava no Supabase (update otimista) e destrava as dependentes.
- **Design system** (`app/globals.css`): o tema claro "papel calmo" que definimos.

## Arquitetura

```
Next.js (Vercel)  ── UI + API routes/server actions
      │
      ├─ Supabase ── Postgres (dados + RLS) + Auth
      │
      ├─ lib/engine.ts ── conflito, janelas, previsão (determinístico, barato)
      │
      └─ Claude API ── só narra o briefing e formula sugestões (v1.5)
```

Regra de ouro de custo: **o motor faz o trabalho pesado; o LLM só narra.** É o que fecha a conta de R$ 39/mês com margem.

## Setup (10 min)

1. **Crie um projeto no [Supabase](https://supabase.com)** (free tier serve).
2. **Rode o schema**: SQL Editor → cole `supabase/migrations/0001_init.sql` → Run.
3. **Variáveis**: copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. **Instale e rode**:
   ```bash
   npm install
   npm run dev
   ```
5. Acesse `http://localhost:3000`, entre com seu e-mail (link mágico).
6. **Dados de exemplo** (opcional): pegue seu user id em Authentication → Users, troque no topo de `supabase/seed.sql` e rode no SQL Editor.

## Deploy

Vercel: importe o repo, cole as duas env vars, deploy. Configure a URL de redirect do Supabase (Authentication → URL Configuration) para o domínio da Vercel.

## Escopo — v1 (o wedge) vs. v2

**Lançar primeiro (funciona no dia 1, com pouco dado):**
- Onboarding → Bússola (briefing) → Tarefas/Card com Focus Flow
- Captura manual de tarefas e compromissos
- Briefing narrado com Claude API

**v2 (depois de retenção provada — dependem de integração e histórico):**
- Sync de calendário (Google/Outlook/Apple) → worker Python + os deltas
- Motor de Convergência (as sombras + conflito magenta)
- Índice de Carga Cognitiva (precisa de dados de saúde + semanas de uso)

Não construa o sync de calendário primeiro. É a parte mais frágil e cara, e depende de as duas esferas já terem vida.

## Faturamento

Assinatura R$ 39/mês, web-first (sem loja de app → sem comissão de 15–30%). Trial de 7–14 dias com IA limitada (anti-abuso). Custo variável ~R$ 6/usuário; break-even operacional ~30 assinantes. Pagamento: Stripe ou Mercado Pago (Pix é essencial no BR).

## Próximos arquivos a portar (do protótipo)

- `app/app/page.tsx` — Bússola (briefing). Já existe no protótipo `norte-mvp.html`.
- `app/onboarding/*` — calibração em 3 passos.
- Bússola → briefing narrado: server action chamando a Claude API com o contexto do dia.
