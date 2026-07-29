import { LegalPage } from "@/components/legal-page";

/**
 * Política de Privacidade.
 *
 * Escrita a partir do que o sistema realmente faz — colunas do banco,
 * integrações com terceiros, retenção — e não de modelo genérico. Política que
 * declara coisas falsas é pior que nenhuma: cria obrigação que ninguém cumpre e
 * some com a credibilidade das partes verdadeiras.
 *
 * A distinção que sustenta o documento inteiro: o Barber Recall é CONTROLADOR
 * dos dados do barbeiro que assina, e OPERADOR dos dados dos clientes dele. Quem
 * decide coletar o telefone do cliente é a barbearia, não nós — e é a barbearia
 * que responde por ter base legal para isso. Modelo pronto quase sempre erra
 * este ponto, e o erro transfere para o fornecedor uma responsabilidade que não
 * é dele nem ele consegue cumprir.
 */
export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de Privacidade" atualizadoEm="29 de julho de 2026">
      <p>
        Esta política explica quais dados o Barber Recall coleta, por que coleta, com quem
        compartilha e o que você pode exigir a respeito. Está escrita para ser lida — se algum
        trecho não fizer sentido, pergunte pelo contato no fim da página.
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O Barber Recall é operado por <strong>Roseilson Gledson Costa Linhares</strong>, inscrito no{" "}
        CPF <strong>705.126.424-94</strong>, com sede em{" "}
        Mossoró, Rio Grande do Norte.
      </p>
      <p>
        Contato para qualquer assunto de privacidade, incluindo os pedidos descritos na seção 7:{" "}
        <strong>barberrecall@gmail.com</strong>.
      </p>

      <h2>2. Dois papéis diferentes, e por que isso importa para você</h2>
      <p>
        O sistema lida com dois grupos de pessoas, e a nossa responsabilidade sobre cada um é
        diferente:
      </p>
      <ul>
        <li>
          <strong>Barbeiros e donos de barbearia que assinam o serviço.</strong> Sobre estes dados
          somos <strong>controladores</strong>: nós decidimos o que coletar e para quê.
        </li>
        <li>
          <strong>Clientes das barbearias</strong>, cujos dados o barbeiro cadastra no sistema.
          Sobre estes somos <strong>operadores</strong>: apenas guardamos e processamos a pedido da
          barbearia. Quem decide coletar, o que coletar e para que usar é a barbearia — e é ela quem
          precisa ter autorização do cliente para isso.
        </li>
      </ul>
      <p>
        Na prática: se você é cliente de uma barbearia e quer saber por que seus dados estão lá, ou
        quer que sejam apagados, o pedido deve ser feito <strong>à barbearia</strong>. Nós ajudamos
        a barbearia a cumprir, mas não podemos decidir sozinhos sobre dados que não são nossos.
      </p>

      <h2>3. Que dados são tratados</h2>

      <h3>3.1 Do barbeiro que assina</h3>
      <ul>
        <li>Nome e e-mail, informados no cadastro</li>
        <li>Senha, guardada apenas como hash — não temos como ler sua senha</li>
        <li>Nome, telefone, e-mail, cidade, logo e cores da barbearia</li>
        <li>WhatsApp e Instagram, se você preencher</li>
        <li>Situação do plano: gratuito ou pago, e a data de validade</li>
        <li>Registros técnicos de acesso, como data e hora das requisições</li>
      </ul>

      <h3>3.2 Dos clientes da barbearia, cadastrados pelo barbeiro</h3>
      <ul>
        <li>Nome e telefone</li>
        <li>E-mail e data de nascimento, quando preenchidos</li>
        <li>Observações livres que o barbeiro escrever</li>
        <li>Histórico de atendimentos: datas, valores, serviços e profissional</li>
        <li>Situação de retorno, calculada a partir da última visita</li>
      </ul>
      <p>
        O campo de observações aceita texto livre. Recomendamos às barbearias que não registrem ali
        informações sensíveis — condições de saúde, convicções religiosas, origem racial ou dados
        parecidos —, porque a LGPD dá a esses dados proteção reforçada e o sistema não foi desenhado
        para esse nível de exigência.
      </p>

      <h3>3.3 Pagamento</h3>
      <p>
        <strong>Não recebemos, não vemos e não guardamos dados de cartão.</strong> O pagamento
        acontece inteiramente no Mercado Pago. O que retorna para nós é apenas a confirmação de que
        houve pagamento e por qual assinatura.
      </p>

      <h2>4. Para que os dados são usados</h2>
      <table>
        <thead>
          <tr>
            <th>Finalidade</th>
            <th>Base legal (LGPD art. 7º)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Manter sua conta e permitir o acesso</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>Cobrar a assinatura e controlar a validade do plano</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>Enviar e-mail de recuperação de senha</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>Calcular e mostrar métricas de retorno de clientes</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>Guardar registros técnicos para investigar falhas e abusos</td>
            <td>Legítimo interesse</td>
          </tr>
          <tr>
            <td>Cumprir obrigações fiscais e responder autoridades</td>
            <td>Obrigação legal</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Não vendemos dados. Não usamos os dados de uma barbearia para outra. Não fazemos
        publicidade dirigida.</strong>
      </p>

      <h2>5. Cookies e rastreamento</h2>
      <p>
        Usamos <strong>um</strong> cookie, chamado <code>connect.sid</code>, que serve apenas para
        manter você conectado depois do login. Sem ele o sistema não funciona.
      </p>
      <p>
        <strong>Não há Google Analytics, pixel do Facebook, nem qualquer ferramenta de rastreamento
        ou publicidade.</strong> Não seguimos você por outros sites.
      </p>

      <h2>6. Com quem os dados são compartilhados</h2>
      <p>Apenas com fornecedores necessários para o serviço funcionar:</p>
      <table>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Para quê</th>
            <th>Onde</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Neon</td>
            <td>Banco de dados</td>
            <td>Estados Unidos</td>
          </tr>
          <tr>
            <td>Railway</td>
            <td>Hospedagem do sistema</td>
            <td>Estados Unidos</td>
          </tr>
          <tr>
            <td>Mercado Pago</td>
            <td>Processamento de pagamentos</td>
            <td>Brasil</td>
          </tr>
          <tr>
            <td>Brevo</td>
            <td>Envio de e-mail de recuperação de senha</td>
            <td>União Europeia</td>
          </tr>
        </tbody>
      </table>

      <h3>Transferência internacional</h3>
      <p>
        Como você vê acima, os dados ficam armazenados fora do Brasil. Isso é uma transferência
        internacional, prevista no art. 33 da LGPD, e acontece porque é necessária para a execução do
        contrato que você firmou conosco. Os fornecedores mantêm cláusulas contratuais de proteção de
        dados e certificações de segurança próprias.
      </p>

      <h2>7. Seus direitos</h2>
      <p>O art. 18 da LGPD garante a você:</p>
      <ul>
        <li>Confirmação de que tratamos seus dados, e acesso a eles</li>
        <li>Correção de dados incompletos ou errados</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei</li>
        <li>Portabilidade para outro fornecedor</li>
        <li>Eliminação dos dados tratados com base em consentimento</li>
        <li>Informação sobre com quem compartilhamos</li>
        <li>Revogação do consentimento</li>
      </ul>
      <p>
        Escreva para <strong>barberrecall@gmail.com</strong>. Respondemos em até{" "}
        <strong>15 dias</strong>. Podemos pedir uma confirmação de identidade antes de atender —
        justamente para não entregar seus dados a quem se passe por você.
      </p>
      <p>
        <strong>Se você é cliente de uma barbearia</strong>, encaminhe o pedido à barbearia que
        cadastrou seus dados. Se ela não responder, escreva para nós e ajudaremos a localizar o
        responsável.
      </p>

      <h2>8. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Enquanto a conta existir:</strong> todos os dados descritos acima.
        </li>
        <li>
          <strong>Depois do cancelamento:</strong> mantemos os dados por <strong>90 dias</strong>,
          para o caso de você querer voltar ou precisar exportar algo. Passado esse prazo, são
          apagados.
        </li>
        <li>
          <strong>Exclusão a pedido:</strong> se você pedir a exclusão antes disso, apagamos em até
          15 dias.
        </li>
        <li>
          <strong>Registros fiscais de pagamento:</strong> guardados por 5 anos, por obrigação legal,
          mesmo depois da exclusão da conta.
        </li>
      </ul>

      <h2>9. Segurança</h2>
      <p>Medidas que hoje estão em funcionamento:</p>
      <ul>
        <li>Conexão criptografada (HTTPS) em todo o sistema</li>
        <li>Senhas guardadas como hash bcrypt, nunca em texto</li>
        <li>Separação entre barbearias: cada consulta ao banco é restrita à barbearia de quem pediu</li>
        <li>Limite de tentativas de login, para dificultar ataques de força bruta</li>
        <li>Links de recuperação de senha de uso único, válidos por uma hora</li>
      </ul>
      <p>
        Nenhum sistema é imune. Se acontecer um incidente que possa causar risco relevante a você,
        comunicaremos você e a ANPD, como manda o art. 48 da LGPD.
      </p>

      <h2>10. Menores de idade</h2>
      <p>
        O serviço é destinado a maiores de 18 anos, que são quem contrata. Se uma barbearia cadastrar
        um cliente menor de idade, cabe a ela obter o consentimento de pelo menos um dos pais ou do
        responsável legal, como exige o art. 14 da LGPD.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Podemos atualizar este texto. Quando a mudança for relevante, avisamos por e-mail e dentro do
        sistema com pelo menos 15 dias de antecedência. A data no topo sempre indica a versão em
        vigor.
      </p>

      <h2>12. Encarregado de dados</h2>
      <p>
        O encarregado pelo tratamento de dados pessoais é Roseilson Gledson Costa Linhares,
        contatável em <strong>barberrecall@gmail.com</strong>.
      </p>
    </LegalPage>
  );
}
