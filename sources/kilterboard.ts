export namespace KilterBoard {
  export interface Ascent {
    uuid: string;
    wall_uuid: null;
    climb_uuid: string;
    angle: number;
    is_mirror: boolean;
    user_id: number;
    attempt_id: number;
    bid_count: number;
    quality: number;
    difficulty: number;
    grade: number;
    is_benchmark: boolean;
    is_listed: boolean;
    comment: string;
    climbed_at: Date;
    created_at: Date;
    updated_at: Date;
  }

  export interface Bid {
    uuid: string;
    user_id: number;
    climb_uuid: string;
    angle: number;
    is_mirror: boolean;
    bid_count: number;
    is_listed: boolean;
    comment: string;
    climbed_at: Date;
    created_at: Date;
    updated_at: Date;
  }

  export interface Climb {
    uuid: string;
    name: string;
    description: string;
    is_nomatch: boolean;
    hsm: number;
    edge_left: number;
    edge_right: number;
    edge_bottom: number;
    edge_top: number;
    frames_count: number;
    frames_pace: number;
    frames: string;
    setter_id: number;
    setter_username: string;
    layout_id: number;
    is_draft: boolean;
    is_listed: boolean;
    created_at: Date;
    updated_at: Date;
  }
}

export const difficulty_grades = [
  { boulder_name: "1a/V0", difficulty: 1 },
  { boulder_name: "1b/V0", difficulty: 2 },
  { boulder_name: "1c/V0", difficulty: 3 },
  { boulder_name: "2a/V0", difficulty: 4 },
  { boulder_name: "2b/V0", difficulty: 5 },
  { boulder_name: "2c/V0", difficulty: 6 },
  { boulder_name: "3a/V0", difficulty: 7 },
  { boulder_name: "3b/V0", difficulty: 8 },
  { boulder_name: "3c/V0", difficulty: 9 },
  { boulder_name: "4a/V0", difficulty: 10 },
  { boulder_name: "4b/V0", difficulty: 11 },
  { boulder_name: "4c/V0", difficulty: 12 },
  { boulder_name: "5a/V1", difficulty: 13 },
  { boulder_name: "5b/V1", difficulty: 14 },
  { boulder_name: "5c/V2", difficulty: 15 },
  { boulder_name: "6a/V3", difficulty: 16 },
  { boulder_name: "6a+/V3", difficulty: 17 },
  { boulder_name: "6b/V4", difficulty: 18 },
  { boulder_name: "6b+/V4", difficulty: 19 },
  { boulder_name: "6c/V5", difficulty: 20 },
  { boulder_name: "6c+/V5", difficulty: 21 },
  { boulder_name: "7a/V6", difficulty: 22 },
  { boulder_name: "7a+/V7", difficulty: 23 },
  { boulder_name: "7b/V8", difficulty: 24 },
  { boulder_name: "7b+/V8", difficulty: 25 },
  { boulder_name: "7c/V9", difficulty: 26 },
  { boulder_name: "7c+/V10", difficulty: 27 },
  { boulder_name: "8a/V11", difficulty: 28 },
  { boulder_name: "8a+/V12", difficulty: 29 },
  { boulder_name: "8b/V13", difficulty: 30 },
  { boulder_name: "8b+/V14", difficulty: 31 },
  { boulder_name: "8c/V15", difficulty: 32 },
  { boulder_name: "8c+/V16", difficulty: 33 },
  { boulder_name: "9a/V17", difficulty: 34 },
  { boulder_name: "9a+/V18", difficulty: 35 },
  { boulder_name: "9b/V19", difficulty: 36 },
  { boulder_name: "9b+/V20", difficulty: 37 },
  { boulder_name: "9c/V21", difficulty: 38 },
  { boulder_name: "9c+/V22", difficulty: 39 },
];

// Approximate mapping of KilterBoard "difficulty" to TopLogger "grade"
export const difficultyToGradeMap = {
  1: 1,
  2: 1.33,
  3: 1.67,
  4: 2,
  5: 2.33,
  6: 2.67,
  7: 3,
  8: 3.33,
  9: 3.67,
  10: 4,
  11: 4.33,
  12: 4.67,
  13: 5,
  14: 5.33,
  15: 5.67,
  16: 6,
  17: 6.17,
  18: 6.33,
  19: 6.5,
  20: 6.67,
  21: 6.83,
  22: 7,
  23: 7.17,
  24: 7.33,
  25: 7.5,
  26: 7.67,
  27: 7.83,
  28: 8,
  29: 8.17,
  30: 8.33,
  31: 8.5,
  32: 8.67,
  33: 8.83,
  34: 9,
  35: 9.17,
  36: 9.33,
  37: 9.5,
  38: 9.67,
  39: 9.83,
} as const;
