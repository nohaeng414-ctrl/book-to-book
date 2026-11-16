export function toArabicNumerals(value: number): string {
  return new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(value);
}
