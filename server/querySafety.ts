/**
 * Escapa texto fornecido por pessoas antes de colocá-lo em uma expressão SQL
 * LIKE. A barra invertida é o escape padrão do MySQL e do TiDB.
 */
export function escapeLikeLiteral(value: string) {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

export function containsLikePattern(value: string) {
  return `%${escapeLikeLiteral(value)}%`;
}

export function startsWithLikePattern(value: string) {
  return `${escapeLikeLiteral(value)}%`;
}
