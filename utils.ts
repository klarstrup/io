export class RelativeURL extends URL {
  constructor(url: string | URL) {
    super(url, "http://n");
  }
  override toString() {
    return super.toString().replace("http://n", "");
  }
  override get href() {
    return this.toString();
  }
}

export const percentile = (rank: number, tally: number) =>
  ((1 - rank / tally) * 100).toLocaleString("en-DK", {
    unit: "percent",
    maximumSignificantDigits: 2,
  });

export function chunk<I>(arr: I[], size: number) {
  const results: I[][] = [];

  while (arr.length) results.push(arr.splice(0, size));

  return results;
}

export function seconds2time(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  seconds = seconds - hours * 3600 - minutes * 60;

  return `${hours ? `${hours}:` : ""}${
    minutes < 10 ? `0${minutes}` : String(minutes)
  }:${seconds < 10 ? `0${seconds}` : String(seconds)}`;
}
