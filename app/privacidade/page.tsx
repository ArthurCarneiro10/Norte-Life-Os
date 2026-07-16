export const metadata = { title: "Política de Privacidade · Norte" };

export default function Privacidade() {
  return (
    <div className="legal">
      <a href="/app" className="legal-back">‹ voltar</a>
      <div className="legal-brand">NORTE</div>
      <h1>Política de Privacidade</h1>
      <p className="legal-date">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <p>
        O Norte é um sistema operacional pessoal. Para funcionar, ele precisa saber coisas sobre a sua
        rotina — e por isso levamos privacidade a sério. Esta política explica, sem juridiquês, o que
        coletamos, por quê, e o que você pode exigir de nós a qualquer momento.
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        [RAZÃO SOCIAL], CNPJ [NÚMERO], é a controladora dos seus dados, nos termos da Lei nº 13.709/2018
        (LGPD). Contato do encarregado (DPO): <b>[SEU E-MAIL]</b>.
      </p>

      <h2>2. Que dados coletamos</h2>
      <ul>
        <li><b>Cadastro:</b> e-mail e senha (a senha é armazenada com hash — nem nós conseguimos lê-la).</li>
        <li><b>Calibração:</b> seu nome, seu pico de energia (cronotipo) e o seu “norte” da temporada.</li>
        <li><b>Uso do app:</b> tarefas, sub-etapas, prazos, categorias, anotações, rascunhos, compromissos
          da agenda e sessões de foco.</li>
        <li><b>Pagamento:</b> processado pela Stripe. <b>Não</b> recebemos nem armazenamos os dados do seu
          cartão — guardamos apenas identificadores da assinatura.</li>
        <li><b>Técnicos:</b> registros de acesso e erros, para segurança e funcionamento.</li>
      </ul>

      <h2>3. Dados sensíveis</h2>
      <p>
        Você pode, por sua escolha, registrar compromissos ligados à saúde ou ao bem-estar (consulta,
        treino, terapia). Esses dados podem ser considerados sensíveis pela LGPD. Nós os tratamos apenas
        para exibir sua agenda e calcular suas janelas livres — <b>nunca</b> para publicidade, criação de
        perfil comercial ou venda. O registro é opcional: se preferir, use títulos genéricos.
      </p>

      <h2>4. Por que tratamos (base legal)</h2>
      <ul>
        <li><b>Execução do contrato</b> (art. 7º, V): fornecer o app que você assinou.</li>
        <li><b>Consentimento</b> (art. 7º, I e art. 11, I): para dados sensíveis que você optar por registrar.</li>
        <li><b>Obrigação legal</b> (art. 7º, II): guarda de registros e emissão fiscal.</li>
        <li><b>Legítimo interesse</b> (art. 7º, IX): segurança e prevenção a fraude.</li>
      </ul>

      <h2>5. Com quem compartilhamos (operadores)</h2>
      <p>Não vendemos seus dados. Compartilhamos apenas com quem é necessário para o app existir:</p>
      <ul>
        <li><b>Supabase</b> — banco de dados e autenticação.</li>
        <li><b>Vercel</b> — hospedagem do aplicativo.</li>
        <li><b>Stripe</b> — processamento de pagamentos.</li>
        <li><b>Anthropic (Claude)</b> — <b>importante:</b> para gerar seu briefing diário, enviamos um
          resumo mínimo do seu dia (primeiro nome, título da prioridade, janela de foco, quantidade de
          compromissos). Não enviamos suas anotações, rascunhos, e-mail ou histórico completo.</li>
      </ul>
      <p>
        Alguns operadores processam dados fora do Brasil. A transferência internacional segue o art. 33
        da LGPD, com cláusulas contratuais e garantias adequadas.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir. Se você excluir a conta, apagamos seus dados pessoais em até 30 dias,
        exceto o que a lei exigir manter (por exemplo, registros fiscais e de acesso).
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        A LGPD te garante: confirmação e acesso, correção, anonimização ou exclusão, portabilidade,
        informação sobre compartilhamento, e revogação do consentimento. Dentro do app, em
        <b> Você → Seus dados</b>, você pode <b>exportar tudo</b> em um arquivo e <b>excluir sua conta</b>
        na hora. Para os demais pedidos, escreva para <b>[SEU E-MAIL]</b> — respondemos em até 15 dias.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Os dados trafegam criptografados (HTTPS) e ficam isolados por usuário no banco, com regras que
        impedem que uma conta acesse a de outra. Nenhum sistema é infalível: se ocorrer um incidente
        relevante, avisaremos você e a ANPD conforme a lei.
      </p>

      <h2>9. Menores de idade</h2>
      <p>O Norte não é destinado a menores de 18 anos.</p>

      <h2>10. Mudanças</h2>
      <p>
        Se esta política mudar de forma relevante, avisamos por e-mail ou dentro do app antes de a mudança
        valer.
      </p>

      <p className="legal-warn">
        ⚠️ Documento em revisão jurídica. Substitua os campos entre colchetes e valide com um advogado
        antes do lançamento comercial.
      </p>
    </div>
  );
}
