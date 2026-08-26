import React from "react";
import { Home, SearchX } from "lucide-react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";

export default function NotFound() {
  return <PortalLayout><div className="container flex min-h-[58vh] items-center py-12 sm:py-16"><section className="max-w-2xl rounded-[1.7rem] bg-white p-8 shadow-[0_8px_30px_rgba(18,25,32,.05)] sm:p-12"><SearchX className="text-[#1e4a77]" size={34} aria-hidden="true" /><p className="mt-7 text-xs font-bold tracking-[.12em] text-[#1e4a77]">PÁGINA NÃO ENCONTRADA</p><h1 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-5xl">Este endereço não está disponível.</h1><p className="mt-5 max-w-xl leading-7 text-black/65">O link pode estar incompleto, ter sido movido ou não fazer parte da cobertura pública atual. Volte à consulta para encontrar um registro oficial.</p><Link href="/busca" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#171c21] px-5 py-3 font-bold text-white transition hover:bg-[#1e4a77] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"><Home size={17} /> Ir para a consulta</Link></section></div></PortalLayout>;
}
