import { Link, useLocation } from "wouter";
import { Menu, Scale, Search } from "lucide-react";
import React, { useState } from "react";

const navigation = [
  { href: "/busca", label: "Buscar emendas" },
  { href: "/cobertura", label: "Dados disponíveis" },
  { href: "/chat", label: "Fazer uma pergunta" },
  { href: "/metodologia", label: "Como usamos os dados" },
  { href: "/metodologia#glossario", label: "Palavras explicadas" },
  {
    href: "/api/v1/openapi.json",
    label: "Para desenvolvedores",
    external: true,
  },
];

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="underline decoration-black/30 underline-offset-4 hover:text-[#1e4a77]"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <div className="min-h-screen bg-[#f6f6f3] text-[#16191d]">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo principal
      </a>
      <header className="site-header">
        <div className="site-header-meta hidden sm:block">
          <div className="container flex items-center justify-between py-2">
            <span>Dados públicos · explicados com clareza</span>
            <span>
              <strong>2022–2025</strong> · fontes para conferência
            </span>
          </div>
        </div>
        <div className="container flex min-h-[4.5rem] items-center justify-between gap-5">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-sm font-black tracking-[-0.05em] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"
          >
            <span
              className="grid size-9 place-items-center rounded-full bg-[#151a20] text-[#f7f8f9] transition-transform duration-150 group-active:scale-95"
              aria-hidden="true"
            >
              <Scale size={18} strokeWidth={2.4} />
            </span>
            <span className="text-xl leading-none">
              Emendas
              <br />
              <span className="font-light tracking-[-0.06em]">em foco</span>
            </span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-2 text-sm font-semibold md:flex"
          >
            {navigation.map(item =>
              item.external ? (
                <a key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${location === item.href ? "nav-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
          <button
            className="grid size-10 place-items-center rounded-md border border-black/15 bg-white md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
          >
            <Menu size={19} />
          </button>
        </div>
        {open && (
          <nav
            aria-label="Navegação móvel"
            className="container flex flex-col gap-1 border-t border-black/10 bg-[#faf9f6] py-4 md:hidden"
          >
            {navigation.map(item =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded px-2 py-3 font-medium hover:bg-black/5"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded px-2 py-3 font-medium hover:bg-black/5"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        )}
      </header>
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer mt-20 border-t border-black/10">
        <div className="container grid gap-8 py-10 md:grid-cols-2 xl:grid-cols-4">
          <section>
            <p className="font-black tracking-[-0.04em]">Emendas em Foco</p>
            <p className="mt-2 text-sm leading-6 text-black/65">
              Plataforma para entender dados oficiais sobre emendas. Confira
              sempre as fontes e os órgãos de controle quando precisar.
            </p>
          </section>
          <section className="text-sm leading-6 text-black/65">
            <p className="font-bold text-black">De onde vêm os dados</p>
            <p className="mt-2">
              <FooterLink href="https://api.portaldatransparencia.gov.br/">
                Portal da Transparência (CGU)
              </FooterLink>
              ,{" "}
              <FooterLink href="https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados">
                Transferegov
              </FooterLink>{" "}
              e{" "}
              <FooterLink href="https://www.ibge.gov.br/estatisticas/sociais/populacao/9103-estimativas-de-populacao.html">
                IBGE
              </FooterLink>
              . Cada resultado mostra de onde veio e quando foi obtido.
            </p>
          </section>
          <section className="text-sm leading-6 text-black/65">
            <p className="font-bold text-black">Como cuidamos dos dados</p>
            <p className="mt-2">
              Usamos apenas dados públicos necessários à consulta. Não deixamos
              senhas ou chaves no código. Quando faltar informação, mostramos
              que ela não está disponível, em vez de inventar um valor.
            </p>
            <p className="mt-2">
              Se encontrar uma informação estranha, confirme na fonte original
              ou procure os canais oficiais responsáveis.
            </p>
          </section>
          <section className="text-sm leading-6 text-black/65">
            <p className="font-bold text-black">Uso responsável</p>
            <p className="mt-2">
              A análise se apoia no direito de acesso à informação e na
              publicidade de interesse público previstos na{" "}
              <FooterLink href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm">
                Lei nº 12.527/2011 (LAI)
              </FooterLink>
              . O tratamento de dados pessoais deve observar a{" "}
              <FooterLink href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm">
                Lei nº 13.709/2018 (LGPD)
              </FooterLink>
              .
            </p>
            <p className="mt-2">
              Este site é informativo e de interesse público. Ele não serve para
              acusações nem substitui orientação jurídica.
            </p>
          </section>
        </div>
      </footer>
    </div>
  );
}

export function CompactSearchLink() {
  return (
    <Link
      href="/busca"
      className="inline-flex items-center gap-2 rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-[#1e4a77]/45 hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"
    >
      <Search size={16} /> Fazer uma busca
    </Link>
  );
}
