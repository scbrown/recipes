export type Nutrients = {
  calories: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  fiber?: number;
  net_carbs?: number;
  sodium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  magnesium_mg?: number;
  zinc_mg?: number;
  vitamin_b12_ug?: number;
  vitamin_d_ug?: number;
};

export type IngredientData = {
  name: string;
  units: Record<string, number>;
  nutrition_per_100g: Nutrients;
};

export type Quantity = {
  amount?: number;
  unit?: string;
  pinch?: boolean;
};

export type IngredientContribution = {
  ingredientId: string;
  grams: number;
  nutrients: Nutrients;
};

export type ComputedNutrition = {
  total: Nutrients;
  perServing: Nutrients | null;
  contributions: IngredientContribution[];
};
