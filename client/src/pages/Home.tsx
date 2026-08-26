import { ArrowDownRight, CircleDashed, FileCheck2, Landmark, Search } from "lucide-react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import SearchPanel from "@/components/SearchPanel";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const steps = [
  { icon: Landmark, title: "O dinheiro foi reservado?", text: "Mostramos as etapas de orçamento, empenho, liquidação e pagamento como fatos diferentes." },
  { icon: CircleDashed, title: "A entrega foi confirmada?", text: "A situação da obra ou do serviço só aparece como comprovada quando a fonte oficial permite verificar." },
  { icon: FileCheck2, title: "É possível auditar?", text: "Cada número preserva sua fonte, link, data de extração e limite de interpretação." },
];

export default function Home() {
  const sources = trpc.emendas.sources.useQuery(undefined, { retry: false });
  const portal = sources.data?.find(source => source.name === "Portal da Transparência (CGU)");
  return <PortalLayout>
    <section className="hero-grid overflow-hidden border-b border-black/10">
      <div className="container relative py-16 sm:py-24 lg:py-28">
        <div className="absolute -right-12 top-8 size-44 rounded-full bg-[#b6d6f0]/70 blur-[1px]" aria-hidden="true" />
        <div className="absolute bottom-0 right-[25%] size-24 rotate-12 rounded-[1.7rem] bg-[#edbdc7]/80" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <p className="eyebrow">DINHEIRO PÚBLICO, LEITURA CLARA</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.92] tracking-[-0.07em] text-[#151a20] sm:text-6xl lg:text-7xl">Acompanhe a emenda <span className="font-light italic">até a entrega.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">Consulte o caminho de cada emenda parlamentar — da indicação ao pagamento — e veja, com honestidade, quando ainda faltam dados para provar o resultado no município.</p>
        </div>
        <div className="relative mt-10 max-w-5xl"><SearchPanel /></div>
        <div className="relative mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-black/65"><span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${portal?.status === "available" ? "bg-[#1e4a77]" : "bg-black/35"}`} />Fonte financeira inicial: Portal da Transparência{portal ? ` · atualizada em ${formatDate(portal.latestSuccessfulLoadAt)}` : " · aguardando primeira carga"}</span><Link className="inline-flex items-center gap-1 font-semibold underline decoration-black/25 underline-offset-4" href="/metodologia">Como lemos os dados <ArrowDownRight size={15} /></Link></div>
      </div>
    </section>
    <section className="container py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[.8fr_2fr] lg:items-start"><div><p className="eyebrow">SEM CONFUNDIR AS ETAPAS</p><h2 className="mt-3 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Pagar não é, sozinho, entregar.</h2><p className="mt-4 max-w-sm leading-7 text-black/65">A execução financeira e a execução do objeto são medidas separadas. Uma obra pode receber recurso e ainda não estar pronta.</p></div><div className="grid gap-4 md:grid-cols-3">{steps.map(step => <article key={step.title} className="rounded-[1.4rem] bg-white p-6 shadow-[0_8px_30px_rgba(18,25,32,0.05)]"><step.icon size={23} className="text-[#1e4a77]" aria-hidden="true" /><h3 className="mt-8 font-bold tracking-[-0.025em]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-black/65">{step.text}</p></article>)}</div></div>
    </section>
    <section className="border-y border-black/10 bg-[#e9eff4]"><div className="container grid gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:items-center"><div><p className="eyebrow">ENTENDA ANTES DE CONCLUIR</p><h2 className="mt-3 text-3xl font-black tracking-[-0.055em]">Dados ausentes aparecem como ausentes.</h2><p className="mt-4 max-w-2xl leading-7 text-black/65">Não preenchemos lacunas com estimativas e não atribuímos irregularidade. A plataforma apresenta registros, suas limitações e links para conferência.</p></div><Link className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-bold shadow-sm transition hover:bg-[#f9e4e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href="/metodologia"><Search size={17} /> Ler metodologia e glossário</Link></div></section>
  </PortalLayout>;
}
