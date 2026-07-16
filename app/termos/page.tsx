export const metadata = { title: "Termos de Uso · Norte" };

export default function Termos() {
  return (
    <div className="legal">
      <a href="/app" className="legal-back">‹ voltar</a>
      <div className="legal-brand">NORTE</div>
      <h1>Termos de Uso</h1>
      <p className="legal-date">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <p>
        Ao criar uma conta no Norte, você concorda com estes termos. Eles são um contrato entre você e
        [RAZÃO SOCIAL], CNPJ [NÚMERO] (“nós”).
      </p>

      <h2>1. O que é o Norte</h2>
      <p>
        Um assinatura de software (SaaS) que ajuda você a organizar tarefas, agenda, foco e prioridades.
        O Norte oferece <b>sugestões</b> — a decisão é sempre sua. Você é o piloto.
      </p>

      <h2>2. Não somos conselho profissional</h2>
      <p>
        O Norte <b>não</b> é serviço de saúde, psicologia, medicina ou aconselhamento profissional de
        qualquer natureza. Índices de energia, alertas e sugestões são estimativas de software e não
        substituem a avaliação de um profissional. Se você estiver com sua saúde física ou mental em
        sofrimento, procure ajuda qualificada.
      </p>

      <h2>3. Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais.</li>
        <li>Você é responsável por manter sua senha em segurança.</li>
        <li>Uma conta é individual e pessoal.</li>
      </ul>

      <h2>4. Assinatura, cobrança e cancelamento</h2>
      <ul>
        <li>A assinatura custa <b>R$ 39,00 por mês</b>, cobrada de forma recorrente pelo cartão, via Stripe.</li>
        <li>A renovação é automática até você cancelar.</li>
        <li>
          Você pode <b>cancelar quando quiser</b>. O acesso continua até o fim do período já pago, e não há
          nova cobrança depois disso.
        </li>
        <li>
          <b>Arrependimento:</b> conforme o art. 49 do Código de Defesa do Consumidor, na contratação pela
          internet você pode desistir em até <b>7 dias</b> a contar da contratação, com devolução do valor pago.
        </li>
        <li>Se o pagamento falhar, o acesso pode ser suspenso até a regularização.</li>
        <li>Mudanças de preço serão avisadas com pelo menos 30 dias de antecedência.</li>
      </ul>

      <h2>5. Uso aceitável</h2>
      <p>Você concorda em não: usar o Norte para atividade ilegal; tentar burlar o pagamento ou acessar
        dados de outros usuários; sobrecarregar ou atacar a infraestrutura; revender ou copiar o serviço.</p>

      <h2>6. Seus dados e conteúdo</h2>
      <p>
        O que você escreve no Norte é <b>seu</b>. Não reivindicamos propriedade sobre suas tarefas,
        anotações ou rascunhos. Nós só os tratamos para operar o serviço, conforme a{" "}
        <a href="/privacidade">Política de Privacidade</a>. Você pode exportar ou apagar tudo a qualquer
        momento.
      </p>

      <h2>7. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o Norte no ar, mas o serviço é fornecido “como está”. Pode haver
        instabilidade, manutenção e falhas. Recomendamos não usar o Norte como única cópia de informação
        crítica.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida em lei, nossa responsabilidade total fica limitada ao valor pago por
        você nos 12 meses anteriores ao evento. Nada aqui afasta os direitos que o Código de Defesa do
        Consumidor te garante.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Você pode encerrar sua conta a qualquer momento pelo app. Podemos encerrar contas que violem estes
        termos, com aviso quando possível.
      </p>

      <h2>10. Lei e foro</h2>
      <p>
        Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor para resolver
        controvérsias.
      </p>

      <h2>11. Contato</h2>
      <p>[SEU E-MAIL]</p>

      <p className="legal-warn">
        ⚠️ Documento em revisão jurídica. Substitua os campos entre colchetes e valide com um advogado
        antes do lançamento comercial.
      </p>
    </div>
  );
}
