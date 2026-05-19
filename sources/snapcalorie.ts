export namespace SnapCalorie {
  export interface JWT {
    id: number;
    sessionId: number;
    scopes: string[];
    role: string;
    groups: unknown[];
    iat: number;
    exp: number;
    iss: string;
    sub: string;
  }
  export interface Auth {
    accessToken: string;
    refreshToken: string;
  }

  export interface Meal {
    id: number;
    userId: number;
    createDate: Date;
    title: null;
    deleted: boolean;
    deletedAt: null;
    notes: null;
    type: string;
    createdAt: Date;
    attributes: Attributes;
    updatedAt: Date;
    dateIso: Date;
    timeIsoStr: string;
    timeZone: string;
    labels: Label[];
    images: Image[];
  }

  export interface Attributes {
    uuid: string;
    dishName?: string;
    isReviewed: boolean;
    reviewedAt?: Date;
    reviewerId?: number;
    newFavorite: boolean;
    reviewerEmail?: string;
    depthDimensions?: null;
    totalPortionNumServings?: number;
  }

  export interface Image {
    id: string;
    path: string;
    uploadDate: Date;
    mealId: number;
    imageType: string;
    onScale: boolean;
    userId: number;
    exifData: null;
    attributes: null;
    createdAt: Date;
    labels: unknown[];
  }

  export interface Label {
    id: number;
    date: Date;
    userId: null;
    labels: Labels;
    notes: Notes;
    typeName: Type;
    typeVersion: string;
    attributes: null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Labels {
    data: Data;
    type: Type;
  }

  export interface Data {
    foods: Food[];
    totalValues: TotalValues;
  }

  export interface Food {
    fat_g: number;
    carb_g: number;
    mass_g: number;
    micros: { [key: string]: Micro };
    fiber_g?: number;
    sugar_g: number;
    metadata: Metadata;
    food_name: string;
    protein_g: number;
    sodium_mg: number;
    food_group?: number;
    net_carb_g?: number;
    alt_classes?: string[];
    energy_kcal: number;
    saturates_g: number;
    serving_qty: number;
    alt_measures: AltMeasure[];
    potassium_mg?: number;
    serving_unit: string;
    percent_fruit?: number;
    cholesterol_mg?: number;
    generic_food_name?: string;
    percent_vegetable?: number;
    is_beverage?: boolean;
    percent_legume_or_nuts?: number;
    upc?: string;
  }

  export interface AltMeasure {
    qty: number;
    measure: string;
    serving_weight: number;
  }

  export interface Metadata {
    source?: string;
    sources?: unknown[];
    nutrition_label_urls?: string[];
    product_image_uri?: string;
  }

  export interface Micro {
    id: number;
    amt: number;
    name: Name;
    unit: Unit;
  }

  export enum Name {
    CalciumCA = "Calcium, Ca",
    FattyAcidsTotalTransMonoenoic = "Fatty acids, total trans-monoenoic",
    FolateTotal = "Folate, total",
    IronFe = "Iron, Fe",
    MagnesiumMg = "Magnesium, Mg",
    Niacin = "Niacin",
    PotassiumK = "Potassium, K",
    Riboflavin = "Riboflavin",
    Thiamin = "Thiamin",
    VitaminARAE = "Vitamin A, RAE",
    VitaminB6 = "Vitamin B-6",
    VitaminCTotalAscorbicAcid = "Vitamin C, total ascorbic acid",
    VitaminDD2D3 = "Vitamin D (D2 + D3)",
    VitaminEAlphaTocopherol = "Vitamin E (alpha-tocopherol)",
    VitaminKPhylloquinone = "Vitamin K (phylloquinone)",
    ZincZn = "Zinc, Zn",
  }

  export enum Unit {
    G = "g",
    Iu = "IU",
    Mcg = "mcg",
    Mg = "mg",
    Μg = "µg",
  }

  export interface TotalValues {
    fat_g: number;
    carb_g: number;
    mass_g: number;
    micros: { [key: string]: Micro };
    fiber_g: number;
    sugar_g: number;
    food_name: string;
    protein_g: number;
    raw_query: string;
    sodium_mg: number;
    food_group: number;
    alt_classes: unknown[];
    description: string;
    energy_kcal: number;
    saturates_g: number;
    serving_qty: number;
    alt_measures: unknown[];
    potassium_mg: number;
    serving_unit: ServingUnit;
    cholesterol_mg: number;
  }

  export enum ServingUnit {
    Serving = "serving",
  }

  export enum Type {
    TextSubmissionNutritionData = "text_submission_nutrition_data",
  }

  export enum Notes {
    Empty = "",
    NutritionDataFromSnapCalorieB2BAPI = "Nutrition data from SnapCalorie B2B API",
  }
}
