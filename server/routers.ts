import { COOKIE_NAME } from "@shared/const";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { alertSubscriptions } from "../drizzle/schema";
import { getDb } from "./db";
import {
  getMunicipalityPerCapitaSummary,
  getPublicCoverageSummary,
  getRecentSourceStatus,
  getStoredAmendment,
  getStoredMunicipalityAmendments,
  hasStoredAmendments,
  searchStoredAmendments,
} from "./emendas";
import {
  fetchPortalAmendments,
  fetchPortalDocuments,
  type OfficialAmendment,
} from "./portalTransparency";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getOfficialSuggestions } from "./publicApi";
import { askPublicDataChat } from "./publicChat";
import { getClientRequestKey } from "./publicRateLimit";

const queryInput = z.object({
  query: z.string().trim().max(120).default(""),
  year: z.number().int().min(2016).max(2100).default(new Date().getFullYear()),
  uf: z.string().trim().toUpperCase().length(2).optional(),
  status: z
    .enum([
      "executada_comprovada",
      "em_execucao",
      "pendencia",
      "nao_cumprida",
      "informacao_insuficiente",
    ])
    .optional(),
  minPaid: z.number().nonnegative().optional(),
  author: z.string().trim().min(1).max(255).optional(),
  budgetFunction: z.string().trim().min(1).max(180).optional(),
  page: z.number().int().min(1).max(100).default(1),
});

const coverageFilterInput = z.object({
  authorId: z.number().int().positive().optional(),
  party: z.string().trim().min(1).max(32).optional(),
});

function matches(record: OfficialAmendment, query: string) {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase("pt-BR");
  return [
    record.author,
    record.locality,
    record.number,
    record.code,
    record.budgetFunction,
    record.budgetSubfunction,
    record.type,
  ]
    .filter(Boolean)
    .some(value => value?.toLocaleLowerCase("pt-BR").includes(normalized));
}

function matchesFilter(value: string | null, filter: string | undefined) {
  return (
    !filter ||
    Boolean(
      value
        ?.toLocaleLowerCase("pt-BR")
        .includes(filter.toLocaleLowerCase("pt-BR"))
    )
  );
}

function sumKnown(
  records: OfficialAmendment[],
  field:
    | "committed"
    | "settled"
    | "paid"
    | "remainingRegistered"
    | "remainingCancelled"
    | "remainingPaid"
) {
  const values = records
    .map(record => record[field])
    .filter((value): value is number => value !== null);
  return values.length
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  emendas: router({
    search: publicProcedure.input(queryInput).query(async ({ input }) => {
      const [storedRecords, storedYearAvailable] = await Promise.all([
        searchStoredAmendments(input),
        hasStoredAmendments(input.year),
      ]);
      const records = storedYearAvailable
        ? storedRecords
        : input.uf
          ? []
          : await fetchPortalAmendments({ year: input.year, page: input.page });
      const filtered = records
        .filter(
          record =>
            matches(record, input.query) &&
            matchesFilter(record.author, input.author) &&
            matchesFilter(record.budgetFunction, input.budgetFunction) &&
            (!input.status || record.complianceStatus === input.status) &&
            (input.minPaid === undefined ||
              (record.paid !== null && record.paid >= input.minPaid))
        )
        .slice(0, 40);
      return {
        records: filtered,
        count: filtered.length,
        query: input.query,
        sourceCoverage: storedYearAvailable
          ? input.uf
            ? "O filtro UF retorna apenas emendas com vínculo territorial documental no catálogo conciliado ou código municipal IBGE. Registros sem esse vínculo não recebem UF por texto de localidade."
            : "Resultados das cargas oficiais persistidas. A rota CGU de emendas não documenta parâmetro de UF; cobertura territorial só é afirmada quando existe vínculo documental no catálogo conciliado ou código municipal IBGE."
          : input.uf
            ? "O filtro UF exige carga persistida: a rota CGU de emendas não documenta consulta territorial por UF."
            : "Resultados da página consultada na fonte oficial. A ampliação nacional depende das cargas persistidas e conciliadas.",
      };
    }),
    suggestions: publicProcedure
      .input(z.object({ query: z.string().trim().min(2).max(120) }))
      .query(async ({ input }) => {
        const suggestions = await getOfficialSuggestions(input.query);
        return {
          beneficiaries: suggestions.beneficiaries.map(item => ({
            label: item.cnpj ? `${item.cnpj} · ${item.name}` : item.name,
            value: item.cnpj ?? item.name,
          })),
          municipalities: suggestions.municipalities.map(item => ({
            label: `${item.name} · ${item.uf}`,
            value: item.name,
          })),
          objects: suggestions.objects.map(item => ({
            label: item.label,
            value: item.label,
          })),
        };
      }),
    overview: publicProcedure
      .input(queryInput.omit({ query: true }))
      .query(async ({ input }) => {
        const records = await fetchPortalAmendments(input);
        return {
          financial: {
            committed: sumKnown(records, "committed"),
            settled: sumKnown(records, "settled"),
            paid: sumKnown(records, "paid"),
            remainingRegistered: sumKnown(records, "remainingRegistered"),
            remainingCancelled: sumKnown(records, "remainingCancelled"),
          },
          recordCount: records.length,
          updatedAt: records[0]?.extractedAt ?? null,
          sourceUrl:
            records[0]?.sourceUrl ??
            "https://api.portaldatransparencia.gov.br/",
          coverage:
            "Agregação da página consultada na fonte oficial. Não representa, por si só, o total nacional do ano.",
        };
      }),
    byCode: publicProcedure
      .input(
        z.object({
          code: z.string().trim().min(1).max(32),
          year: z.number().int().min(2016).max(2100),
        })
      )
      .query(async ({ input }) => {
        const stored = await getStoredAmendment(input.code, input.year);
        if (stored) return stored;
        const records = await fetchPortalAmendments({
          year: input.year,
          page: 1,
        });
        return records.find(record => record.code === input.code) ?? null;
      }),
    documents: publicProcedure
      .input(z.object({ code: z.string().trim().min(1).max(32) }))
      .query(async ({ input }) => fetchPortalDocuments(input.code)),
    sources: publicProcedure.query(async () => getRecentSourceStatus()),
    coverage: publicProcedure
      .input(coverageFilterInput.optional())
      .query(async ({ input }) => getPublicCoverageSummary(input)),
    municipalityPerCapita: publicProcedure
      .input(
        z.object({
          municipality: z.string().trim().min(2).max(180),
          year: z.number().int().min(2016).max(2100),
        })
      )
      .query(async ({ input }) => getMunicipalityPerCapitaSummary(input)),
    municipalityAmendments: publicProcedure
      .input(
        z.object({
          municipality: z.string().trim().min(2).max(180),
          year: z.number().int().min(2016).max(2100),
        })
      )
      .query(async ({ input }) => getStoredMunicipalityAmendments(input)),
  }),
  chat: router({
    ask: publicProcedure
      .input(
        z.object({
          question: z.string().trim().min(1).max(600),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().trim().min(1).max(600),
              })
            )
            .max(6)
            .default([]),
        })
      )
      .mutation(async ({ ctx, input }) =>
        askPublicDataChat({
          ...input,
          requestKey: getClientRequestKey(ctx.req),
        })
      ),
  }),
  subscriptions: router({
    create: protectedProcedure
      .input(
        z
          .object({
            email: z.string().email().max(320),
            municipalityId: z.number().int().positive().optional(),
            authorId: z.number().int().positive().optional(),
          })
          .refine(
            value => Boolean(value.municipalityId || value.authorId),
            "Escolha um município ou um autor para acompanhar."
          )
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new Error("O banco de dados não está disponível no momento.");
        await db.insert(alertSubscriptions).values({
          userId: ctx.user.id,
          municipalityId: input.municipalityId ?? null,
          authorId: input.authorId ?? null,
          email: input.email,
        });
        return { success: true } as const;
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(alertSubscriptions)
        .where(eq(alertSubscriptions.userId, ctx.user.id));
    }),
    setActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new Error("O banco de dados não está disponível no momento.");
        await db
          .update(alertSubscriptions)
          .set({ active: input.active })
          .where(
            and(
              eq(alertSubscriptions.id, input.id),
              eq(alertSubscriptions.userId, ctx.user.id)
            )
          );
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
