#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv
from typing import Dict, List, Any, Tuple, Optional

# Load environment variables
load_dotenv()

# Spoonacular API configuration
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY', '')
SPOONACULAR_BASE_URL = 'https://api.spoonacular.com'

class IngredientAnalysis:
    """Class to handle ingredient analysis using the Spoonacular API"""
    
    @staticmethod
    def analyze_ingredients(ingredients: List[str]) -> Dict[str, Any]:
        """
        Analyze a list of ingredients using Spoonacular API
        
        Args:
            ingredients: List of ingredient strings
            
        Returns:
            Dictionary containing analysis results
        """
        if not SPOONACULAR_API_KEY:
            return {
                'success': False,
                'error': 'Spoonacular API key not configured',
                'ingredients': []
            }
            
        # Join ingredients with newlines for the API
        ingredients_text = '\n'.join(ingredients)
        
        try:
            # Call Spoonacular API for ingredient analysis
            # Using the correct endpoint: /recipes/parseIngredients
            response = requests.post(
                f'{SPOONACULAR_BASE_URL}/recipes/parseIngredients',
                params={
                    'apiKey': SPOONACULAR_API_KEY,
                    'language': 'en'
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data={
                    'ingredientList': ingredients_text,
                    'includeNutrition': 'true',
                    'servings': 1
                }
            )
            
            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'API Error: {response.status_code} - {response.text}',
                    'ingredients': []
                }
                
            data = response.json()
            
            # Process and structure the data
            processed_results = IngredientAnalysis._process_analysis_results(data, ingredients)
            return {
                'success': True,
                'ingredients': processed_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Analysis failed: {str(e)}',
                'ingredients': []
            }
    
    @staticmethod
    def _process_analysis_results(data: Dict[str, Any], original_ingredients: List[str]) -> List[Dict[str, Any]]:
        """
        Process raw API results into a structured format
        
        Args:
            data: Raw API response data
            original_ingredients: Original list of ingredients
            
        Returns:
            List of processed ingredient analysis results
        """
        processed_results = []
        
        # Map to store processed ingredients for lookup
        processed_map = {}
        
        # Process each ingredient from the API response
        if isinstance(data, list):
            for item in data:
                name = item.get('name', '')
                if not name:
                    continue
                    
                # Extract health information
                health_info = IngredientAnalysis._extract_health_info(item)
                
                # Get nutrition data from the new API format
                nutrition_data = {}
                if 'nutrition' in item and isinstance(item['nutrition'], dict):
                    nutrients = item['nutrition'].get('nutrients', [])
                    nutrition_data = {'nutrients': nutrients}
                
                processed_item = {
                    'name': name,
                    'id': item.get('id', 0),
                    'safety_level': health_info['safety_level'],
                    'health_score': health_info['health_score'],
                    'concerns': health_info['concerns'],
                    'benefits': health_info['benefits'],
                    'nutrition': IngredientAnalysis._extract_nutrition(nutrition_data)
                }
                
                processed_map[name.lower()] = processed_item
                processed_results.append(processed_item)
        
        # Match with original ingredients and add any that weren't matched
        for ingredient in original_ingredients:
            ingredient_lower = ingredient.lower()
            found = False
            
            # Check if this ingredient is already processed
            for key in processed_map:
                if key in ingredient_lower or ingredient_lower in key:
                    found = True
                    break
                    
            if not found:
                # Add unmatched ingredient with default values
                processed_results.append({
                    'name': ingredient,
                    'id': 0,
                    'safety_level': 'unknown',
                    'health_score': None,
                    'concerns': [],
                    'benefits': [],
                    'nutrition': {}
                })
        
        return processed_results
    
    @staticmethod
    def _extract_health_info(ingredient_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract health information from ingredient data
        
        Args:
            ingredient_data: Ingredient data from API
            
        Returns:
            Dictionary with health information
        """
        # Default values
        health_info = {
            'safety_level': 'safe',  # safe, caution, or avoid
            'health_score': 70,      # 0-100 score
            'concerns': [],          # List of potential concerns
            'benefits': []           # List of potential benefits
        }
        
        # Extract nutrition data if available
        nutrition = ingredient_data.get('nutrition', {})
        
        # Check for common allergens
        if any(allergen in ingredient_data.get('name', '').lower() for allergen in 
               ['peanut', 'shellfish', 'dairy', 'gluten', 'soy', 'tree nut']):
            health_info['concerns'].append('Common allergen')
            health_info['safety_level'] = 'caution'
        
        # Check for artificial ingredients
        if any(term in ingredient_data.get('name', '').lower() for term in 
               ['artificial', 'additive', 'color', 'preservative', 'nitrate', 'nitrite', 'msg']):
            health_info['concerns'].append('Artificial ingredient')
            health_info['health_score'] = max(0, health_info['health_score'] - 20)
            health_info['safety_level'] = 'caution'
        
        # Check for high sugar
        if nutrition.get('sugar', {}).get('amount', 0) > 5:
            health_info['concerns'].append('High sugar content')
            health_info['health_score'] = max(0, health_info['health_score'] - 10)
        
        # Check for high sodium
        if nutrition.get('sodium', {}).get('amount', 0) > 200:
            health_info['concerns'].append('High sodium content')
            health_info['health_score'] = max(0, health_info['health_score'] - 10)
            health_info['safety_level'] = 'caution'
        
        # Check for healthy ingredients
        if any(term in ingredient_data.get('name', '').lower() for term in 
               ['vegetable', 'fruit', 'whole grain', 'lean protein', 'fiber']):
            health_info['benefits'].append('Nutrient-rich food')
            health_info['health_score'] = min(100, health_info['health_score'] + 10)
        
        # Check for antioxidants
        if any(term in ingredient_data.get('name', '').lower() for term in 
               ['berry', 'citrus', 'green tea', 'turmeric', 'cinnamon']):
            health_info['benefits'].append('Contains antioxidants')
            health_info['health_score'] = min(100, health_info['health_score'] + 5)
        
        return health_info
    
    @staticmethod
    def _extract_nutrition(nutrition_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant nutrition information
        
        Args:
            nutrition_data: Nutrition data from API
            
        Returns:
            Dictionary with simplified nutrition information
        """
        nutrition = {}
        
        # Extract nutrients of interest
        nutrients = nutrition_data.get('nutrients', [])
        for nutrient in nutrients:
            name = nutrient.get('name', '').lower()
            if name in ['calories', 'fat', 'carbohydrates', 'protein', 'sugar', 'sodium']:
                nutrition[name] = {
                    'amount': nutrient.get('amount', 0),
                    'unit': nutrient.get('unit', 'g')
                }
        
        return nutrition

# For testing
if __name__ == '__main__':
    test_ingredients = ['sugar', 'salt', 'olive oil', 'flour']
    result = IngredientAnalysis.analyze_ingredients(test_ingredients)
    print(result)
