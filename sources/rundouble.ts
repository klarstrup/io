export namespace RunDouble {
  export interface HistoryResponse {
    history: HistoryItem[];
    recruits: unknown[];
    user: User;
    cursor?: string;
    loggedInUser: boolean;
    metric: boolean;
  }

  export interface HistoryItem {
    key: number;
    auth?: string;
    completed: string;
    /** Milliseconds since 1970 */
    completedLong: number;
    stageName: string;
    shortCode: string;
    /** Meters */
    runDistance: number;
    /** Milliseconds */
    runTime: number;
    polyline: string;
    /** Kilometers per minute */
    runPace: number;
  }

  export interface MongoHistoryItem extends HistoryItem {
    userId: string;
    completedAt: Date;
  }

  export interface User {
    bestName: string;
    gravatarHash: string;
    points: number;
    referalPoints: number;
    totalPoints: number;
  }

  export interface PlanResponse {
    plan: Plan;
    code: string;
    owner: boolean;
    metric: boolean;
    UID: string;
    authedStrava: boolean;
  }

  export interface Plan {
    id: number;
    instanceid: string;
    planid: string;
    auth: string;
    completed: string;
    mapdata?: Mapdata;
    dataRecord: DataRecord;
    userAuth?: string;
    userNickname: string;
    userGravatar: string;
    stageName: string;
    notes: string;
    planPrivacy: string;
    mapPrivacy: string;
    /** Meters */
    runDistance: number;
    /** Milliseconds */
    runTime: number;
    /** Kilometers per minute */
    runPaceInv: number;
    /** Meters */
    totalDistance: number;
    /** Milliseconds */
    totalTime: number;
    /** Kilometers per minute */
    totalPaceInv: number;
    stages: Stage[];
    /** Milliseconds since 1970 */
    completedLong: number;
    calories: Calories;
    polyline: string;
  }

  export interface Calories {
    totalCals: number;
    runCals: number;
  }

  export interface DataRecord {
    dataPoints: DataPoint[];
    hrPresent: boolean;
    pacePresent: boolean;
  }

  export interface DataPoint {
    /** Milliseconds */
    time: number;
    /** Meters */
    distance: number;
    /** Minutes per mile (wtf) */
    pace: number;
    /** BPM */
    heartRate: number;
    stageIndicator: string;
  }

  export interface Mapdata {
    locations: MapdataLocation[];
    maxLat: number;
    minLat: number;
    maxLng: number;
    minLng: number;
  }

  export interface MapdataLocation {
    stageIndicator: string;
    locations: LocationLocation[];
  }

  export interface LocationLocation {
    lat: number;
    lng: number;
    /** Meters */
    altitude: number;
    /** Milliseconds */
    time: number;
    stageIndicator: string;
  }

  export interface Stage {
    /** Meters */
    accumDistance: number;
    /** Milliseconds */
    accumTime: number;
    stageindicator: string;
    /** Kilometers per minute */
    paceInv: number;
  }
}
