export function escapeODataFilterLiterals(filter: string): string {
  return filter.replace(/'((?:''|[^'])*)'/g, (_match, literalValue: string) => {
    const normalizedValue = literalValue.replace(/''/g, "'");
    const escapedValue = normalizedValue.replace(/'/g, "''");
    return `'${encodeURIComponent(escapedValue)}'`;
  });
}
