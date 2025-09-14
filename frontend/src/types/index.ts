// Common Types for IngredientIQ

export interface Ingredient {
  name: string;
  percentage?: string;
  allergen?: boolean;
  highlighted?: boolean;
}

export interface Product {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string[] | Ingredient[];
  countries: string;
  ingredient_image_url?: string;
  source_db?: string;
}

export interface OCRResult {
  ingredients: string[];
  processing_time: number;
  image_path: string;
  success: boolean;
}

export interface ScanResult {
  type: 'barcode' | 'ocr';
  data: Product | OCRResult;
  timestamp: number;
}

export interface UserPreferences {
  allergens: string[];
  avoidIngredients: string[];
  darkMode: boolean;
  language: string;
}

export interface AppState {
  loading: boolean;
  error: string | null;
  currentProduct: Product | null;
  scanHistory: ScanResult[];
  userPreferences: UserPreferences;
}

export enum ScanType {
  BARCODE = 'barcode',
  CAMERA = 'camera',
  IMAGE = 'image'
}

export enum AppRoute {
  HOME = '/',
  SCAN = '/scan',
  RESULT = '/result',
  HISTORY = '/history',
  PROFILE = '/profile',
  ABOUT = '/about'
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
