import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";

type SearchStatus =
  | ""
  | "executada_comprovada"
  | "em_execucao"
  | "pendencia"
  | "nao_cumprida"
  | "informacao_insuficiente";
type SearchInitialValues = {
  query?: string;
  year?: number;
  uf?: string;
  status?: Exclude<SearchStatus, "">;
  minPaid?: number;
  author?: string;
  budgetFunction?: string;
};

export default function SearchPanel({
  compact = false,
  initialValues,
}: {
  compact?: boolean;
  initialValues?: SearchInitialValues;
}) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState(initialValues?.query ?? "");
  const [year, setYear] = useState(initialValues?.year ?? 2025);
  const [uf, setUf] = useState(initialValues?.uf ?? "");
  const [status, setStatus] = useState<SearchStatus>(
    initialValues?.status ?? ""
  );
  const [minPaid, setMinPaid] = useState(
    initialValues?.minPaid?.toString() ?? ""
  );
  const [author, setAuthor] = useState(initialValues?.author ?? "");
  const [budgetFunction, setBudgetFunction] = useState(
    initialValues?.budgetFunction ?? ""
  );
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!initialValues) return;
    setQuery(initialValues.query ?? "");
    setYear(initialValues.year ?? 2025);
    setUf(initialValues.uf ?? "");
    setStatus(initialValues.status ?? "");
    setMinPaid(initialValues.minPaid?.toString() ?? "");
    setAuthor(initialValues.author ?? "");
    setBudgetFunction(initialValues.budgetFunction ?? "");
  }, [
    initialValues?.query,
    initialValues?.year,
    initialValues?.uf,
    initialValues?.status,
    initialValues?.minPaid,
    initialValues?.author,
    initialValues?.budgetFunction,
  ]);
  const enabled = query.trim().length >= 2;
  const normalizedMinPaid = minPaid.trim() === "" ? undefined : Number(minPaid);
  const suggestions = trpc.emendas.search.useQuery(
    {
      query,
      year,
      uf: uf || undefined,
      status: status || undefined,
      minPaid: Number.isFinite(normalizedMinPaid)
        ? normalizedMinPaid
        : undefined,
      author: author || undefined,
      budgetFunction: budgetFunction || undefined,
      page: 1,
    },
    { enabled, retry: false }
  );
  const extraSuggestions = trpc.emendas.suggestions.useQuery(
    { query },
    { enabled, retry: false }
  );
  const records = suggestions.data?.records.slice(0, 6) ?? [];
  const authors = Array.from(
    new Set(
      records
        .map(record => record.author)
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 3);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ q: query, ano: String(year) });
    if (uf) params.set("uf", uf);
    if (status) params.set("situacao", status);
    if (Number.isFinite(normalizedMinPaid))
      params.set("pagoMin", String(normalizedMinPaid));
    if (author.trim()) params.set("autor", author.trim());
    if (budgetFunction.trim()) params.set("funcao", budgetFunction.trim());
    setLocation(`/busca?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="data-query-panel p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(15rem,1fr)_7rem_6rem_11rem_9rem_11rem_11rem_auto] 2xl:items-end">
        <div>
          <label
            className="mb-1.5 block text-sm font-bold"
            htmlFor="busca-principal"
          >
            O que você quer acompanhar?
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1e4a77]"
              size={20}
              aria-hidden="true"
            />
            <input
              id="busca-principal"
              value={query}
              onFocus={() => setIsFocused(true)}
              onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
              onChange={event => setQuery(event.target.value)}
              role="combobox"
              aria-expanded={isFocused && enabled && records.length > 0}
              aria-controls="sugestoes-busca"
              aria-autocomplete="list"
              placeholder="Cidade, parlamentar, CNPJ, número ou assunto"
              className="query-control h-13 w-full py-3 pl-12 pr-4 text-base outline-none transition focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
            />
            {isFocused &&
              enabled &&
              (suggestions.isFetching || records.length > 0) && (
                <div
                  id="sugestoes-busca"
                  role="listbox"
                  aria-label="Sugestões de busca agrupadas"
                  className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl"
                >
                  {suggestions.isFetching ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-black/65">
                      <Loader2 size={16} className="animate-spin" /> Procurando
                      nos dados oficiais…
                    </div>
                  ) : (
                    <>
                      {records.length > 0 && (
                        <div>
                          <p className="bg-[#edf4fb] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                            Emendas
                          </p>
                          {records.slice(0, 3).map(record => (
                            <button
                              type="button"
                              role="option"
                              key={record.code}
                              className="block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-[#edf4fb] focus:bg-[#edf4fb] focus:outline-none"
                              onClick={() => setQuery(record.code)}
                            >
                              <span className="block text-sm font-bold">
                                Emenda {record.number ?? record.code}
                              </span>
                              <span className="block text-xs text-black/60">
                                {record.author ?? "Autoria não informada"} ·{" "}
                                {record.locality ?? "Localidade não informada"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {authors.length > 0 && (
                        <div>
                          <p className="bg-[#f6f7f8] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                            Parlamentares e bancadas
                          </p>
                          {authors.map(author => (
                            <button
                              type="button"
                              role="option"
                              key={author}
                              className="block w-full border-b border-black/5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#edf4fb] focus:bg-[#edf4fb] focus:outline-none"
                              onClick={() => setQuery(author)}
                            >
                              {author}
                            </button>
                          ))}
                        </div>
                      )}
                      {(extraSuggestions.data?.municipalities.length ?? 0) >
                        0 && (
                        <div>
                          <p className="bg-[#f9e4e8] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-[#822437]">
                            Municípios
                          </p>
                          {extraSuggestions.data!.municipalities.map(item => (
                            <button
                              type="button"
                              role="option"
                              key={item.label}
                              className="block w-full border-b border-black/5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#edf4fb] focus:bg-[#edf4fb] focus:outline-none"
                              onClick={() => setQuery(item.value)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {(extraSuggestions.data?.beneficiaries.length ?? 0) >
                        0 && (
                        <div>
                          <p className="bg-[#edf4fb] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                            CNPJ e beneficiários
                          </p>
                          {extraSuggestions.data!.beneficiaries.map(item => (
                            <button
                              type="button"
                              role="option"
                              key={item.value}
                              className="block w-full border-b border-black/5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#edf4fb] focus:bg-[#edf4fb] focus:outline-none"
                              onClick={() => setQuery(item.value)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {(extraSuggestions.data?.objects.length ?? 0) > 0 && (
                        <div>
                          <p className="bg-[#f6f7f8] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                            Objetos
                          </p>
                          {extraSuggestions.data!.objects.map(item => (
                            <button
                              type="button"
                              role="option"
                              key={item.value}
                              className="block w-full border-b border-black/5 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#edf4fb] focus:bg-[#edf4fb] focus:outline-none"
                              onClick={() => setQuery(item.value)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {!(
                        extraSuggestions.data?.beneficiaries.length ||
                        extraSuggestions.data?.objects.length
                      ) && (
                        <p className="px-4 py-3 text-xs leading-5 text-black/60">
                          CNPJ e objeto aparecerão aqui quando as fontes
                          oficiais de beneficiários e instrumentos estiverem
                          integradas. Não exibimos aproximações.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold" htmlFor="ano-busca">
            Ano
          </label>
          <input
            id="ano-busca"
            type="number"
            min="2016"
            max="2100"
            value={year}
            onChange={event => setYear(Number(event.target.value))}
            className="query-control h-13 w-full px-3 outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold" htmlFor="uf-busca">
            UF
          </label>
          <input
            id="uf-busca"
            value={uf}
            maxLength={2}
            onChange={event => setUf(event.target.value.toUpperCase())}
            placeholder="Todas"
            className="query-control h-13 w-full px-3 uppercase outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-bold"
            htmlFor="situacao-busca"
          >
            Situação
          </label>
          <select
            id="situacao-busca"
            value={status}
            onChange={event => setStatus(event.target.value as typeof status)}
            className="query-control h-13 w-full px-3 text-sm outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          >
            <option value="">Todas</option>
            <option value="em_execucao">Em execução</option>
            <option value="informacao_insuficiente">
              Informação insuficiente
            </option>
            <option value="pendencia">Pendência</option>
            <option value="nao_cumprida">Não cumprida</option>
            <option value="executada_comprovada">Executada e comprovada</option>
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-bold"
            htmlFor="pago-minimo"
          >
            Pago mínimo
          </label>
          <input
            id="pago-minimo"
            type="number"
            min="0"
            step="0.01"
            value={minPaid}
            onChange={event => setMinPaid(event.target.value)}
            placeholder="R$ 0"
            className="query-control h-13 w-full px-3 outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-bold"
            htmlFor="autor-busca"
          >
            Autoria
          </label>
          <input
            id="autor-busca"
            value={author}
            onChange={event => setAuthor(event.target.value)}
            placeholder="Nome ou bancada"
            className="query-control h-13 w-full px-3 outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-bold"
            htmlFor="funcao-busca"
          >
            Função
          </label>
          <input
            id="funcao-busca"
            value={budgetFunction}
            onChange={event => setBudgetFunction(event.target.value)}
            placeholder="Ex.: Saúde"
            className="query-control h-13 w-full px-3 outline-none focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/20"
          />
        </div>
        <button
          className="query-submit h-13 bg-[#171c21] px-6 font-bold text-white transition hover:bg-[#1e4a77] active:scale-[.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"
          type="submit"
        >
          Consultar
        </button>
      </div>
      {!compact && (
        <p className="mt-3 text-sm leading-5 text-black/60">
          Você pode buscar por município, autoria, CNPJ, código ou palavras do
          objeto. Os resultados mostram a fonte e a hora de consulta.
        </p>
      )}
    </form>
  );
}
