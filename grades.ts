export const frenchRounded = {
  key: "french_rounded",
  name: "Font.`",
  description: "Font, rounded below 6a. E.g. 4-, 4 and 4+.",
  types: ["boulder"],
  data: [
    { value: 1, name: "1ᴀ", level: 0 },
    { value: 1.33, name: "1ʙ", level: 0 },
    { value: 1.67, name: "1ᴄ", level: 1 },
    { value: 2, name: "2ᴀ", level: 0 },
    { value: 2.33, name: "2ʙ", level: 0 },
    { value: 2.67, name: "2ᴄ", level: 1 },
    { value: 3, name: "3ᴀ", level: 0 },
    { value: 3.33, name: "3ʙ", level: 1 },
    { value: 3.67, name: "3ᴄ", level: 0 },
    { value: 4, name: "4ᴀ", level: 1 },
    { value: 4.33, name: "4ʙ", level: 1 },
    { value: 4.67, name: "4ᴄ", level: 0 },
    { value: 5, name: "5ᴀ", level: 1 },
    { value: 5.33, name: "5ʙ", level: 1 },
    { value: 5.67, name: "5ᴄ", level: 1 },
    { value: 6, name: "6ᴀ", level: 0, name0: "6", name1: "6ᴀ(⁺)" },
    { value: 6.17, name: "6ᴀ⁺", level: 2 },
    { value: 6.33, name: "6ʙ", level: 1, name1: "6ʙ(⁺)" },
    { value: 6.5, name: "6ʙ⁺", level: 2 },
    { value: 6.67, name: "6ᴄ", level: 1, name1: "6ᴄ(⁺)" },
    { value: 6.83, name: "6ᴄ⁺", level: 2 },
    { value: 7, name: "7ᴀ", level: 0, name0: "7", name1: "7ᴀ(⁺)" },
    { value: 7.17, name: "7ᴀ⁺", level: 2 },
    { value: 7.33, name: "7ʙ", level: 1, name1: "7ʙ(⁺)" },
    { value: 7.5, name: "7ʙ⁺", level: 2 },
    { value: 7.67, name: "7ᴄ", level: 1, name1: "7ᴄ(⁺)" },
    { value: 7.83, name: "7ᴄ⁺", level: 2 },
    { value: 8, name: "8ᴀ", level: 0, name0: "8", name1: "8ᴀ(⁺)" },
    { value: 8.17, name: "8ᴀ⁺", level: 2 },
    { value: 8.33, name: "8ʙ", level: 1, name1: "8ʙ(⁺)" },
    { value: 8.5, name: "8ʙ⁺", level: 2 },
    { value: 8.67, name: "8ᴄ", level: 1, name1: "8ᴄ(⁺)" },
    { value: 8.83, name: "8ᴄ⁺", level: 2 },
    { value: 9, name: "9ᴀ", level: 0, name0: "9", name1: "9ᴀ(⁺)" },
    { value: 9.17, name: "9ᴀ⁺", level: 2 },
    { value: 9.33, name: "9ʙ", level: 1, name1: "9ʙ(⁺)" },
    { value: 9.5, name: "9ʙ⁺", level: 2 },
  ],
} as const;

// Math.round, but with precision. Defaults to 0 decimals.
export function round(value: number, precision = 0) {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export default class Grade {
  climbType = "boulder";
  value: number;
  constructor(value: number) {
    this.value = value || 2.0;
  }

  get system() {
    return frenchRounded;
  }

  // Rounds value to closest in grading sytem and returns corresponding grade item index.
  get idxRound() {
    const roundVal = round(this.value, 2);
    return this.system.data.findIndex((item, index) => {
      const thisValue = item.value;
      const nextItem = this.system.data[index + 1];
      const nextValue = nextItem ? nextItem.value : 100;
      const midwayValue = thisValue + (nextValue - thisValue) / 2;
      return roundVal <= midwayValue;
    });
  }
  get idxFloor() {
    return this.idxCeil - 1;
  }
  get idxCeil() {
    const roundVal = round(this.value, 2);
    const idx = this.system.data.findIndex(
      (item, i) => item.value > roundVal || i == this.system.data.length - 1,
    );
    return idx < 1 ? 1 : idx;
  }

  // System grades
  get roundedGrade() {
    return this.system.data[this.idxRound]!;
  }
  get floorGrade() {
    return this.system.data[this.idxFloor]!;
  }
  get ceilGrade() {
    return this.system.data[this.idxCeil]!;
  }

  // Names
  get name() {
    return this.roundedGrade.name;
  }
  toString() {
    return this.name;
  }
  get nameOrQ() {
    const index = this.idxRound;
    if (index == 0) return "?";
    return this.system.data[index]!.name;
  }
  get nameFloor() {
    return this.floorGrade.name;
  }
  get nameFloorOrQ() {
    const index = this.idxFloor;
    if (index == 0) return "?";
    return this.system.data[index]!.name;
  }
  get nameCeil() {
    return this.ceilGrade.name;
  }
  // Strips the '5.' from the YDS names so they fit in the grade-circles
  get nameStripped() {
    return this.name.replace(/^(5\.)(?=.{3,})/, "");
  }
  get nameOrQStripped() {
    return this.nameOrQ.replace(/^(5\.)(?=.{3,})/, "");
  }

  // Values
  get valueRounded() {
    return this.roundedGrade.value;
  }
  get valueFloor() {
    return this.floorGrade.value;
  }
  get valueCeil() {
    return this.ceilGrade.value;
  }

  // Points
  get points() {
    return round(this.value * 100);
  }
  get pointsRounded() {
    return this.valueRounded * 100;
  }
  get pointsFloor() {
    return this.valueFloor * 100;
  }
  get pointsCeil() {
    return this.valueCeil * 100;
  }

  // Percentages
  get subGradePercent() {
    const next = this.valueCeil;
    const base = this.valueFloor;
    const roundVal = round(this.value, 2);
    const percent = ((roundVal - base) / (next - base)) * 100;
    if (percent < 0) return 0;
    if (percent > 100) return 100;
    return round(percent) || 0; // Prevent NaNs
  }
  get percentToNextGrade() {
    return 100 - this.subGradePercent;
  }
}
