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
    maximumFractionDigits: 1,
  }) + "%";
