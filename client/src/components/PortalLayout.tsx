import { Link, useLocation } from "wouter";
import { Menu, Scale, Search } from "lucide-react";
import React, { useState } from "react";

const navigation = [
  { href: "/busca", label: "Consultar" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/metodologia#glossario", label: "Glossário" },
  { href: "/api/v1/openapi.json", label: "API pública", external: true },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#16191d]">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo principal</a>
      <header className="border-b border-black/10 bg-[#f7f8f9]/90 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-5">
          <Link href="/" className="group flex items-center gap-3 rounded-sm font-black tracking-[-0.05em] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35">
            <span className="grid size-9 place-items-center rounded-full bg-[#151a20] text-[#f7f8f9] transition-transform duration-150 group-active:scale-95" aria-hidden="true"><Scale size={18} strokeWidth={2.4} /></span>
            <span className="text-xl leading-none">Emendas<br /><span className="font-light tracking-[-0.06em]">em foco</span></span>
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navigation.map(item => item.external ? (
              <a key={item.href} href={item.href} className="nav-link">{item.label}</a>
            ) : (
              <Link key={item.href} href={item.href} className={`nav-link ${location === item.href ? "nav-link-active" : ""}`}>{item.label}</Link>
            ))}
          </nav>
          <button className="grid size-10 place-items-center rounded-full border border-black/15 bg-white md:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(value => !value)}>
            <Menu size={19} />
          </button>
        </div>
        {open && <nav aria-label="Navegação móvel" className="container flex flex-col gap-1 border-t border-black/10 py-4 md:hidden">
          {navigation.map(item => item.external ? <a key={item.href} href={item.href} className="rounded px-2 py-3 font-medium hover:bg-black/5">{item.label}</a> : <Link key={item.href} href={item.href} className="rounded px-2 py-3 font-medium hover:bg-black/5" onClick={() => setOpen(false)}>{item.label}</Link>)}
        </nav>}
      </header>
      <main id="conteudo" tabIndex={-1}>{children}</main>
      <footer className="mt-20 border-t border-black/10 bg-[#e8ebee]">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="font-black tracking-[-0.04em]">Emendas em Foco</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/65">Uma plataforma pública para acompanhar recursos de emendas e mostrar, com clareza, o que as fontes oficiais permitem afirmar — e o que ainda não permitem.</p>
          </div>
          <div className="text-sm leading-6 text-black/65">
            <p><a className="underline decoration-black/30 underline-offset-4" href="https://api.portaldatransparencia.gov.br/" target="_blank" rel="noreferrer">Portal da Transparência (CGU)</a> é a fonte financeira inicial.</p>
            <p className="mt-2">Os dados exibidos registram sua origem e hora de extração. Ausência de dado nunca é tratada como zero.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function CompactSearchLink() {
  return <Link href="/busca" className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"><Search size={16} /> Nova consulta</Link>;
}
