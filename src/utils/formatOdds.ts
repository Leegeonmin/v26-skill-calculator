export function formatTopPercent(probability: number | null | undefined): string {
  if (probability == null || !Number.isFinite(probability)) {
    return "-";
  }

  if (probability <= 0) {
    return "0%";
  }

  const percent = probability * 100;
  const fractionDigits =
    percent >= 1 ? 4 : percent >= 0.01 ? 6 : percent >= 0.0001 ? 8 : 10;
  const displayPercent = Math.ceil(percent * 10 ** fractionDigits) / 10 ** fractionDigits;

  return `${displayPercent.toLocaleString("ko-KR", {
    minimumFractionDigits: Math.min(2, fractionDigits),
    maximumFractionDigits: fractionDigits,
  })}%`;
}
