export namespace Meyers {
  export interface MenusResponse {
    external_id: string;
    menus: Menu[];
    subsidiary_name: string;
  }

  export interface MongoMenu extends Menu, Omit<MenusResponse, "menus"> {
    date_time: Date;
  }

  export interface Menu {
    date: string;
    menu_sections: MenuSection[];
    names: Names;
  }

  export interface MenuSection {
    menu_dishes: MenuDish[];
    names: Names;
  }

  export interface MenuDish {
    allergens: Allergen[];
    co2: number;
    descriptions: Names;
    image_url: null;
    ingredients: Ingredient[];
    names: Names;
    nutrition: Nutrition[];
  }

  export interface Allergen {
    code: AllergenCode;
    containment: Containment | null;
    names: Names;
  }

  export enum AllergenCode {
    Celery = "celery",
    Crustaceans = "crustaceans",
    Eggs = "eggs",
    Fish = "fish",
    Gluten = "gluten",
    Lupine = "lupine",
    Milk = "milk",
    Molluscs = "molluscs",
    Mustard = "mustard",
    Peanuts = "peanuts",
    Sesame = "sesame",
    Soybean = "soybean",
    Sulfites = "sulfites",
    TreeNuts = "tree_nuts",
  }

  export enum Containment {
    Contains = "contains",
    FreeFrom = "free_from",
    MayContain = "may_contain",
    Undeclared = "undeclared",
  }

  export interface Names {
    da?: string;
    en?: string;
  }

  export interface Ingredient {
    names: Names;
  }

  export interface Nutrition {
    code: NutritionCode;
    names: Names;
    value: number;
  }

  export enum NutritionCode {
    Alcohol = "alcohol",
    Carbohydrate = "carbohydrate",
    Energy = "energy",
    Fat = "fat",
    Fibre = "fibre",
    Protein = "protein",
    Salt = "salt",
    SaturatedFat = "saturated_fat",
    Sugars = "sugars",
    Water = "water",
  }
}
