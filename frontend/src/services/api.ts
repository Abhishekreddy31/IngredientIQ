import axios, { AxiosRequestConfig } from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: API_BASE_URL + '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Allow cookies to be sent with requests
});

// Export the base URL for direct fetch calls
export const API_URL = API_BASE_URL;

// Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface Product {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string[];
  countries: string;
  ingredient_image_url?: string;
  source_db?: string;
}

export interface OCRResult {
  ingredients: string[];
  processing_time: number;
  image_path: string;
}

export interface IngredientAnalysisResult {
  name: string;
  id: number;
  safety_level: 'safe' | 'caution' | 'avoid' | 'unknown';
  health_score: number | null;
  concerns: string[];
  benefits: string[];
  nutrition: {
    [key: string]: {
      amount: number;
      unit: string;
    };
  };
}

export interface AnalysisResponse {
  success: boolean;
  ingredients: IngredientAnalysisResult[];
  processing_time: number;
  error?: string;
}

// API Service
export const ApiService = {
  // Barcode lookup
  lookupBarcode: async (barcode: string): Promise<ApiResponse<Product>> => {
    try {
      const response = await API.post('/search', { barcode });
      return { 
        data: response.data, 
        success: response.data.success || false,
        message: response.data.error
      };
    } catch (error: any) {
      return { 
        data: {} as Product, 
        success: false, 
        message: error.response?.data?.error || 'Failed to lookup barcode' 
      };
    }
  },

  // OCR processing
  processImage: async (file: File): Promise<ApiResponse<any>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      console.log('Sending OCR request to:', '/ocr');
      const response = await API.post('/ocr', formData, config);
      console.log('OCR response:', response.data);
      return { 
        data: response.data, 
        success: response.data.success || false,
        message: response.data.error
      };
    } catch (error: any) {
      console.error('OCR processing error:', error);
      return { 
        data: { ingredients: [], processing_time: 0, image_path: '' }, 
        success: false, 
        message: error.response?.data?.error || 'Failed to process image' 
      };
    }
  },

  // Process image from camera
  async processCameraImage(blob: Blob): Promise<ApiResponse<OCRResult>> {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'camera-capture.jpg');

      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      console.log('Sending camera OCR request to:', '/ocr');
      const response = await API.post('/ocr', formData, config);
      console.log('Camera OCR response:', response.data);
      return { 
        data: response.data, 
        success: response.data.success || false,
        message: response.data.error
      };
    } catch (error: any) {
      console.error('Camera OCR processing error:', error);
      return { 
        data: { ingredients: [], processing_time: 0, image_path: '' }, 
        success: false, 
        message: error.response?.data?.error || 'Failed to process camera image' 
      };
    }
  },

  // Manual product entry
  addManualProduct: async (product: Partial<Product>): Promise<ApiResponse<Product>> => {
    try {
      const response = await API.post('/product/manual', product);
      return { 
        data: response.data.product, 
        success: response.data.success || false,
        message: response.data.message || response.data.error
      };
    } catch (error: any) {
      return { 
        data: {} as Product, 
        success: false, 
        message: error.response?.data?.error || 'Failed to add product' 
      };
    }
  },

  // Health check
  healthCheck: async (): Promise<boolean> => {
    try {
      const response = await API.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },
  
  // Analyze ingredients
  analyzeIngredients: async (ingredients: string[]): Promise<ApiResponse<AnalysisResponse>> => {
    try {
      const response = await API.post('/analyze-ingredients', { ingredients });
      return { 
        data: response.data, 
        success: response.data.success || false,
        message: response.data.error
      };
    } catch (error: any) {
      return { 
        data: { 
          success: false, 
          ingredients: [], 
          processing_time: 0,
          error: error.response?.data?.error || 'Failed to analyze ingredients'
        }, 
        success: false, 
        message: error.response?.data?.error || 'Failed to analyze ingredients' 
      };
    }
  }
};

export default ApiService;
