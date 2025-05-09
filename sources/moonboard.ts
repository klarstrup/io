export namespace MoonBoard {
  export interface GetLogbookResponse {
    Data: GetLogbookResponseDatum[];
    Total: number;
    AggregateResults: null;
    Errors: null;
  }

  export interface GetLogbookResponseDatum {
    Id: number;
    Count: number;
    ClimbDate: string;
  }

  export interface GetLogbookEntriesResponse {
    Data: LogbookEntry[];
    Total: number;
    AggregateResults: null;
    Errors: null;
  }

  export interface LogbookEntry {
    Id: number;
    Problem: Problem;
    Attempts: number;
    Grade: Grade | null;
    NumberOfTries: NumberOfTries;
    Rating: number;
    DateClimbed: string;
    DateClimbedAsString: string;
    DateInserted: string;
    Comment: null | string;
    IsSuggestedBenchmark: boolean;
    User: User;
    MoonBoard: MoonBoard | null;
  }
  export interface MongoLogbookEntry
    extends Omit<LogbookEntry, "DateClimbed" | "DateInserted" | "Problem"> {
    DateClimbed: Date;
    DateInserted: Date | null;
    GradeNumber: number | null;
    Problem: MongoProblem;
  }
  export interface MongoProblem
    extends Omit<Problem, "DateInserted" | "DateUpdated" | "DateDeleted"> {
    DateInserted: Date | null;
    DateUpdated: Date | null;
    DateDeleted: Date | null;
    GradeNumber: number;
    UserGradeNumber: number | null;
  }

  export enum Grade {
    Grade5Plus = "5+",
    Grade6A = "6A",
    Grade6APlus = "6A+",
    Grade6B = "6B",
    Grade6BPlus = "6B+",
    Grade6C = "6C",
    Grade6CPlus = "6C+",
    Grade7A = "7A",
    Grade7APlus = "7A+",
    Grade7B = "7B",
    Grade7BPlus = "7B+",
    Grade7C = "7C",
    Grade7CPlus = "7C+",
    Grade8A = "8A",
  }

  export interface MoonBoard {
    Name: string;
    Description: string;
    Address: string | null;
    PostalCode: null;
    Url: null;
    Email: string | null;
    Telephone: string | null;
    City: string;
    Country: string;
    IsCommercial: boolean;
    IsLed: boolean;
    ShareInDirectory: boolean;
    Latitude: number;
    Longitude: number;
    MoonBoardUser: null;
    ImageUrl: string;
    Id: number;
    ApiId: number;
    DateInserted: null;
    DateUpdated: null;
    DateDeleted: null;
    DateTimeString: string;
  }

  export enum NumberOfTries {
    Flashed = "Flashed",
    MoreThan3Tries = "more than 3 tries",
    The2NdTry = "2nd try",
    The3RDTry = "3rd try",
  }

  export interface Problem {
    Method: Method;
    Name: string;
    Grade: Grade;
    UserGrade: Grade | null;
    MoonBoardConfiguration: MoonBoardConfiguration;
    MoonBoardConfigurationId: number;
    Setter: User;
    FirstAscender: boolean;
    Rating: number;
    UserRating: number;
    Repeats: number;
    Attempts: number;
    Holdsetup: Holdsetup;
    IsBenchmark: boolean;
    IsMaster: boolean;
    IsAssessmentProblem: boolean;
    ProblemType: null;
    Moves: unknown[];
    Holdsets: Holdset[];
    Locations: Location[];
    RepeatText: null;
    NumberOfTries: null;
    NameForUrl: string;
    Upgraded: boolean;
    Downgraded: boolean;
    Id: number;
    ApiId: number;
    DateInserted: string;
    DateUpdated: null;
    DateDeleted: null;
    DateTimeString: string;
  }

  export interface Holdset {
    Id: number;
    Description: HoldsetDescription;
    Color: HoldsetColor;
    Holds: null;
  }

  export enum HoldsetColor {
    Ded4Bb = "#ded4bb",
    Dee1Ce = "#dee1ce",
    F6F60C = "#f6f60c",
    Ff0000 = "#ff0000",
    The000000 = "#000000",
    The4198D4 = "#4198D4",
  }

  export enum HoldsetDescription {
    HoldSetA = "Hold Set A",
    HoldSetB = "Hold Set B",
    HoldSetC = "Hold Set C",
    HoldSetD = "Hold Set D",
    HoldSetE = "Hold Set E",
    HoldSetF = "Hold Set F",
    OriginalSchoolHolds = "Original School Holds",
    WoodenHolds = "Wooden Holds",
    WoodenHoldsB = "Wooden Holds B",
    WoodenHoldsC = "Wooden Holds C",
  }

  export interface Holdsetup {
    Id: number;
    Description: HoldsetupDescription;
    Setby: null;
    DateInserted: null;
    DateUpdated: null;
    DateDeleted: null;
    IsLocked: boolean;
    IsMini: boolean;
    Active: boolean;
    Holdsets: null;
    MoonBoardConfigurations: null;
    HoldLayoutId: number;
    AllowClimbMethods: boolean;
  }

  export enum HoldsetupDescription {
    MiniMoonBoard2020 = "Mini MoonBoard 2020",
    MiniMoonBoard2025 = "Mini MoonBoard 2025",
    MoonBoard2016 = "MoonBoard 2016",
    MoonBoard2024 = "MoonBoard 2024",
    MoonBoardMasters2017 = "MoonBoard Masters 2017",
    MoonBoardMasters2019 = "MoonBoard Masters 2019",
  }

  export interface Location {
    Id: number;
    Holdset: null;
    Description: null;
    X: number;
    Y: number;
    Color: LocationColor;
    Rotation: number;
    Type: number;
    HoldNumber: null;
    Direction: number;
    DirectionString: DirectionString;
  }

  export enum LocationColor {
    The0X0000FF = "0x0000FF",
    The0X00FF00 = "0x00FF00",
    The0XFF0000 = "0xFF0000",
  }

  export enum DirectionString {
    N = "N",
  }

  export enum Method {
    AnyMarkedHolds = "Any marked holds",
    Footless = "Footless",
    FootlessKickboard = "Footless + Kickboard",
    NoKickboard = "No kickboard",
  }

  export interface MoonBoardConfiguration {
    Id: number;
    Description: MoonBoardConfigurationDescription;
    LowGrade: null;
    HighGrade: null;
  }

  export enum MoonBoardConfigurationDescription {
    The25MoonBoard = "25° MoonBoard",
    The40MoonBoard = "40° MoonBoard",
  }

  export interface User {
    Id: string;
    Nickname: string;
    Firstname: string;
    Lastname: null | string;
    City: null | string;
    Country: string;
    ProfileImageUrl: string;
    CanShareData: boolean;
  }
}

// Approximate mapping of moonboard "grade" to TopLogger "grade"
export const moonboardGradeStringToNumber = {
  "5+": 5.5,
  "6A": 6,
  "6A+": 6.17,
  "6B": 6.33,
  "6B+": 6.5,
  "6C": 6.67,
  "6C+": 6.83,
  "7A": 7,
  "7A+": 7.17,
  "7B": 7.33,
  "7B+": 7.5,
  "7C": 7.67,
  "7C+": 7.83,
  "8A": 8,
} as const;
