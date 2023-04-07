export namespace Fitocracy {
  export interface ActivityHistoryEntry {
    actions: ActionElement[];
    date: Date;
    id: Date;
  }

  export interface ActionElement {
    action: ActionAction;
    action_group_id: number;
    actiondate: Date;
    actiontime: Date;
    allow_share: boolean;
    api_id: string;
    api_source: string;
    effort0: null;
    effort0_imperial: null;
    effort0_imperial_string: null;
    effort0_imperial_unit: null;
    effort0_metric: null;
    effort0_metric_string: null;
    effort0_metric_unit: null;
    effort0_string: null;
    effort0_unit: null;
    effort1: number;
    effort1_imperial: number;
    effort1_imperial_string: string;
    effort1_imperial_unit: Effort1Unit;
    effort1_metric: number;
    effort1_metric_string: string;
    effort1_metric_unit: Effort1Unit;
    effort1_string: string;
    effort1_unit: Effort1Unit;
    effort2: null;
    effort2_imperial: null;
    effort2_imperial_string: null;
    effort2_imperial_unit: null;
    effort2_metric: null;
    effort2_metric_string: null;
    effort2_metric_unit: null;
    effort2_string: null;
    effort2_unit: null;
    effort3: null;
    effort3_imperial: null;
    effort3_imperial_string: null;
    effort3_imperial_unit: null;
    effort3_metric: null;
    effort3_metric_string: null;
    effort3_metric_unit: null;
    effort3_string: null;
    effort3_unit: null;
    effort4: null;
    effort4_imperial: null;
    effort4_imperial_string: null;
    effort4_imperial_unit: null;
    effort4_metric: null;
    effort4_metric_string: null;
    effort4_metric_unit: null;
    effort4_string: null;
    effort4_unit: null;
    effort5: null;
    effort5_imperial: null;
    effort5_imperial_string: null;
    effort5_imperial_unit: null;
    effort5_metric: null;
    effort5_metric_string: null;
    effort5_metric_unit: null;
    effort5_string: null;
    effort5_unit: null;
    id: number;
    is_pr: boolean;
    notes: string;
    points: number;
    string: string;
    string_imperial: string;
    string_metric: string;
    subgroup: number;
    subgroup_order: number;
    submitted: boolean;
    user: User;
  }

  export interface ActionAction {
    actiontype: number;
    description: string;
    effort0: boolean;
    effort0_label: string;
    effort1: boolean;
    effort1_label: Effort1Label;
    effort2: boolean;
    effort2_label: string;
    effort3: boolean;
    effort3_label: string;
    effort4: boolean;
    effort4_label: string;
    effort5: boolean;
    effort5_label: string;
    id: number;
    multiplier: number;
    name: string;
    set_name: string;
  }

  export enum Effort1Label {
    Reps = "Reps",
  }

  export interface Effort1Unit {
    abbr: Abbr;
    id: number;
    name: Effort1Label;
  }

  export enum Abbr {
    Reps = "reps",
  }

  export interface User {
    hero: boolean;
    id: number;
    imperial: boolean;
    info: string;
    level: number;
    pic: string;
    points: number;
    title: null;
    username: string;
  }
  export interface UserActivity {
    count: number;
    id: number;
    name: string;
  }
}
