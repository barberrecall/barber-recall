import { LegalPage } from "@/components/legal-page";

/**
 * Termos de Uso.
 *
 * Dois pontos que modelo pronto costuma omitir e que aqui são obrigatórios:
 *
 * O direito de arrependimento de 7 dias (CDC art. 49) vale para contratação
 * fora do estabelecimento — assinatura pela internet é exatamente isso.
 * Cláusula que o negue é nula, então declará-lo é honestidade e também evita
 * discussão depois.
 *
 * A responsabilidade pelo envio de mensagens no WhatsApp é da barbearia. O
 * sistema monta o link e abre a conversa no aparelho do barbeiro; quem aperta
 * enviar é ele, e é ele que precisa ter autorização do cliente para receber
 * mensagem. Sem isso escrito, a responsabilidade escorregaria para o fornecedor.
 */
export default function TermosPage() {
  return (
    <LegalPage titulo="Termos de Uso" atualizadoEm="29 de julho de 2026">
      <p>
        Estes termos regem o uso do Barber Recall. Ao criar uma conta, você concorda com eles. Se
        não concordar com algum ponto, não use o serviço — e, se quiser, escreva para nós explicando
        o motivo.
      </p>

      <h2>1. Quem oferece o serviço</h2>
      <p>
        O Barber Recall é oferecido por <strong>Roseilson Gledson Costa Linhares</strong>, inscrito no{" "}
        CPF <strong>705.126.424-94</strong>, com sede em{" "}
        Mossoró, Rio Grande do Norte. Contato:{" "}
        <strong>barberrecall@gmail.com</strong>.
      </p>

      <h2>2. O que o serviço faz</h2>
      <p>
        O Barber Recall é um sistema de gestão para barbearias, acessível por navegador e por
        aplicativo. Ele permite cadastrar clientes, registrar atendimentos, acompanhar quem está sem
        voltar há muito tempo, montar campanhas de retorno e ver métricas do negócio.
      </p>
      <p>
        <strong>O sistema não envia mensagens sozinho.</strong> Ele identifica quem deve ser
        contatado e prepara o texto; o envio acontece pelo WhatsApp do próprio barbeiro, que revisa e
        aperta enviar. Isso é decisão de produto, não limitação — veja a seção 6.
      </p>

      <h2>3. Conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais para contratar.</li>
        <li>Os dados do cadastro devem ser verdadeiros e atualizados.</li>
        <li>
          A senha é sua responsabilidade. Não temos como lê-la — se perdê-la, use a recuperação por
          e-mail.
        </li>
        <li>
          Uma conta corresponde a uma barbearia. Compartilhar acesso entre estabelecimentos
          diferentes não é permitido.
        </li>
      </ul>

      <h2>4. Plano, pagamento e cancelamento</h2>

      <h3>4.1 Teste gratuito</h3>
      <p>
        Contas novas têm <strong>3 dias</strong> de acesso completo, sem cobrança e sem precisar
        cadastrar forma de pagamento. Terminado o prazo, o acesso aos dados fica bloqueado até a
        assinatura ser ativada. <strong>Seus dados não são apagados</strong> — voltam a ficar
        acessíveis assim que você assinar.
      </p>

      <h3>4.2 Assinatura</h3>
      <p>
        O Plano Pro custa <strong>R$ 69,90 por mês</strong>. O pagamento é processado pelo Mercado
        Pago, por PIX ou cartão. No cartão, a cobrança é recorrente e se renova automaticamente até
        você cancelar.
      </p>

      <h3>4.3 Direito de arrependimento</h3>
      <p>
        Como a contratação acontece pela internet, você tem <strong>7 dias corridos</strong> a partir
        do pagamento para desistir e receber a devolução integral, conforme o art. 49 do Código de
        Defesa do Consumidor. Basta escrever para <strong>barberrecall@gmail.com</strong>. Não
        perguntamos o motivo.
      </p>

      <h3>4.4 Cancelamento</h3>
      <p>
        Você pode cancelar quando quiser. O acesso continua até o fim do período já pago — não há
        multa nem fidelidade. Passados os 7 dias do arrependimento, não devolvemos valores
        proporcionais do mês em curso.
      </p>

      <h3>4.5 Mudança de preço</h3>
      <p>
        Se o preço mudar, avisamos com <strong>30 dias</strong> de antecedência por e-mail. O novo
        valor só vale a partir do ciclo seguinte, e você pode cancelar antes disso sem custo.
      </p>

      <h2>5. Seus dados são seus</h2>
      <p>
        Os dados que você cadastra — clientes, atendimentos, campanhas — pertencem a você. Não os
        usamos para outro fim, não os vendemos e não os compartilhamos com outras barbearias.
      </p>
      <p>
        Se quiser sair, peça a exportação em <strong>barberrecall@gmail.com</strong> e enviamos seus
        dados em formato aberto. Depois do cancelamento, guardamos por 90 dias e então apagamos —
        conforme a{" "}
        <a href="/privacidade" className="underline">
          Política de Privacidade
        </a>
        .
      </p>

      <h2>6. Sua responsabilidade sobre os clientes cadastrados</h2>
      <p>Este ponto é importante e vale ler com atenção.</p>
      <p>
        Ao cadastrar clientes no sistema, <strong>você é o controlador desses dados</strong> perante
        a LGPD. Nós apenas guardamos e processamos a seu pedido. Isso significa que cabe a você:
      </p>
      <ul>
        <li>Ter autorização do cliente para guardar os dados dele;</li>
        <li>
          Ter autorização para <strong>enviar mensagens de WhatsApp</strong> — enviar para quem não
          pediu pode gerar bloqueio do seu número pelo WhatsApp e responsabilidade perante a lei;
        </li>
        <li>Responder aos pedidos que o cliente fizer sobre os próprios dados;</li>
        <li>Não registrar dados sensíveis no campo de observações.</li>
      </ul>
      <p>
        O sistema prepara a mensagem, mas <strong>quem envia é você</strong>. A decisão de contatar
        cada pessoa é sua, e a responsabilidade acompanha a decisão.
      </p>

      <h2>7. Uso aceitável</h2>
      <p>Não é permitido:</p>
      <ul>
        <li>Usar o sistema para enviar mensagem não solicitada em massa;</li>
        <li>Tentar acessar dados de outra barbearia;</li>
        <li>Sondar, sobrecarregar ou tentar derrubar o serviço;</li>
        <li>Revender ou sublicenciar o acesso;</li>
        <li>Usar o sistema para qualquer atividade ilegal.</li>
      </ul>
      <p>
        Se identificarmos uso desse tipo, podemos suspender a conta. Quando for possível, avisamos
        antes e damos chance de corrigir.
      </p>

      <h2>8. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas <strong>não prometemos funcionamento
        ininterrupto</strong>. Pode haver interrupção por manutenção, falha de fornecedor ou
        problema técnico. Quando a parada for programada, avisamos com antecedência.
      </p>
      <p>
        Também podemos mudar ou descontinuar funcionalidades. Se alguma delas for essencial para
        você e for removida, avisamos com <strong>30 dias</strong> de antecedência e você pode
        cancelar sem custo.
      </p>

      <h2>9. Limite de responsabilidade</h2>
      <p>
        Respondemos por danos diretos comprovadamente causados por falha nossa, limitados ao valor
        que você pagou nos <strong>12 meses</strong> anteriores ao fato.
      </p>
      <p>
        Não respondemos por lucros cessantes, perda de oportunidade, nem por decisões de negócio que
        você tome a partir das métricas do sistema — elas são apoio à decisão, não garantia de
        resultado.
      </p>
      <p>
        Nada aqui afasta responsabilidades que a lei brasileira não permite afastar, especialmente as
        do Código de Defesa do Consumidor.
      </p>

      <h2>10. Encerramento</h2>
      <p>
        Você pode encerrar a conta quando quiser. Podemos encerrar a sua em caso de descumprimento
        destes termos, de falta de pagamento por mais de 30 dias, ou se o serviço for descontinuado —
        neste último caso, com 30 dias de aviso e devolução proporcional do que estiver pago.
      </p>

      <h2>11. Mudanças nestes termos</h2>
      <p>
        Podemos alterar estes termos. Mudanças relevantes são avisadas por e-mail e dentro do sistema
        com <strong>30 dias</strong> de antecedência. Continuar usando depois disso significa
        concordar. Se não concordar, pode cancelar sem custo.
      </p>

      <h2>12. Lei e foro</h2>
      <p>
        Estes termos seguem a lei brasileira. Fica eleito o foro de{" "}
        Mossoró, Rio Grande do Norte, para resolver eventuais disputas —
        ressalvado o direito do consumidor de escolher o foro do seu próprio domicílio, garantido
        pelo Código de Defesa do Consumidor.
      </p>
    </LegalPage>
  );
}
