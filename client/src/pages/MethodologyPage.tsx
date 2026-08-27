import React from "react";
import { BookOpenCheck, CircleHelp, FileWarning, Scale } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";

const statuses = [
  [
    "Executada e comprovada",
    "Exige informação financeira e evidência oficial de execução física ou finalística; não é atribuída apenas porque houve pagamento.",
  ],
  [
    "Em execução dentro do prazo",
    "Há andamento financeiro ou instrumental sem sinal oficial de prazo vencido. Não confirma que o objeto esteja pronto.",
  ],
  [
    "Atraso ou pendência",
    "Há sinal oficial de vigência vencida, prestação de contas pendente ou outro atraso aplicável à fonte integrada.",
  ],
  [
    "Vigência vencida sem entrega",
    "Exige informação oficial de obra paralisada, contas rejeitadas ou vigência vencida sem entrega registrada.",
  ],
  [
    "Informação insuficiente",
    "É usada quando os dados não bastam para avaliar a entrega; é comum mesmo quando há vínculo documental, se ainda faltar evidência finalística suficiente.",
  ],
];
const glossary = [
  [
    "Empenho",
    "Reserva do dinheiro e compromisso formal de pagamento pelo governo.",
  ],
  [
    "Liquidação",
    "Reconhecimento de que uma entrega ou etapa permite o pagamento.",
  ],
  ["Restos a pagar", "Conta de anos anteriores que ficou para pagar depois."],
  [
    "Transferência especial",
    "Modalidade em que o recurso é transferido diretamente ao ente, com rastreabilidade do objeto mais limitada.",
  ],
  [
    "Taxa de casamento",
    "Percentual de emendas que conseguimos relacionar entre fontes usando uma chave estável declarada.",
  ],
];

export default function MethodologyPage() {
  return (
    <PortalLayout>
      <div className="container py-12 sm:py-20">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">COMO USAMOS OS DADOS</p>
            <span className="source-stamp">Regras abertas para conferir</span>
          </div>
          <h1 className="mt-4 text-5xl sm:text-6xl">
            Veja o dado.
            <br />
            <em className="text-[#075d78]">Entenda o que ele permite dizer.</em>
          </h1>
        </div>
        <p className="page-intro mt-7 max-w-3xl">
          Mostramos apenas o que as fontes oficiais informam. Não acusamos
          pessoas e não completamos lacunas. Também separamos dinheiro pago da
          prova de que algo foi entregue.
        </p>
        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          <article className="method-card">
            <Scale className="text-[#1e4a77]" />
            <h2>De onde vem cada informação</h2>
            <p>
              Cada informação guarda o link da fonte, a data em que foi obtida e
              um código de conferência. Assim, qualquer pessoa pode voltar à
              origem e comparar o que mudou depois.
            </p>
          </article>
          <article className="method-card">
            <BookOpenCheck className="text-[#1e4a77]" />
            <h2>Quando duas bases têm o mesmo código</h2>
            <p>
              Os dados financeiros vão de 2022 a 2025. Em 2025, 4.710 das 6.311
              emendas (74,63%) têm o mesmo código no campo oficial
              <code> NR_EMENDA</code> do Transferegov. Isso mostra que os
              registros podem ser ligados, mas não prova entrega.
            </p>
          </article>
          <article className="method-card">
            <FileWarning className="text-[#1e4a77]" />
            <h2>Quando falta dado, avisamos</h2>
            <p>
              Se a fonte não informa algo, mostramos “informação não
              disponível”. Não trocamos falta de dado por zero nem por palpite.
            </p>
          </article>
        </section>
        <section id="semaforo" className="mt-14 scroll-mt-10">
          <div className="flex items-start gap-3">
            <CircleHelp className="mt-1 text-[#1e4a77]" />
            <div>
              <p className="eyebrow">SEMÁFORO DE CUMPRIMENTO</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">
                A cor ajuda a ler. A explicação mostra a regra.
              </h2>
            </div>
          </div>
          <div className="institutional-table results-scroll mt-7 bg-[#fffdf8]">
            <table className="w-full text-left">
              <thead className="bg-[#edf4fb] text-sm">
                <tr>
                  <th className="p-5">Situação</th>
                  <th className="p-5">O que isso quer dizer</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map(([title, text]) => (
                  <tr key={title} className="border-t border-black/7">
                    <th className="p-5 align-top text-sm font-bold">{title}</th>
                    <td className="p-5 text-sm leading-6 text-black/68">
                      {text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section id="glossario" className="mt-14 scroll-mt-10">
          <p className="eyebrow">GLOSSÁRIO</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">
            Orçamento em palavras comuns.
          </h2>
          <dl className="mt-7 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {glossary.map(([term, definition]) => (
              <div key={term} className="border-t-2 border-[#d6d0c4] pt-4">
                <dt className="font-bold">{term}</dt>
                <dd className="mt-2 text-sm leading-6 text-black/68">
                  {definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mt-14 border-l-5 border-[#b76d16] bg-[#142230] p-7 text-white sm:p-9">
          <p className="text-xs font-bold tracking-[.12em] text-[#b6d6f0]">
            LIMITAÇÕES ATUAIS
          </p>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-white/80">
            A plataforma reúne a carga financeira nacional de emendas da CGU de
            2022 a 2025, catálogo complementar do Transferegov e população
            municipal do IBGE para as 27 UFs. A rota CGU de emendas não
            documenta filtro territorial por UF; portanto, a busca por UF só
            exibe emendas quando existe vínculo documental no catálogo
            conciliado ou código municipal IBGE. A conciliação nacional do
            Transferegov publicada alcança 4.710 de 6.311 chaves CGU de 2025 por
            igualdade exata de
            <code>NR_EMENDA</code>; ela não foi estendida aos exercícios
            históricos nesta etapa. Também não afirmamos a situação física do
            objeto, a aprovação de contas ou valores per capita sem vínculo
            municipal e evidência oficial adicional.
          </p>
        </section>
      </div>
    </PortalLayout>
  );
}
