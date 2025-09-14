import unittest
import json
import os
from app import app
from fast_lookup import validate_ean13, split_ingredients

class IngredientIQTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = self.app.get('/api/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'ok')
        self.assertTrue('timestamp' in data)

    def test_barcode_validation(self):
        """Test barcode validation function"""
        # Valid EAN-13 barcode
        is_valid, _ = validate_ean13('5000112637922')
        self.assertTrue(is_valid)
        
        # Invalid EAN-13 barcode (wrong checksum)
        is_valid, _ = validate_ean13('5000112637923')
        self.assertFalse(is_valid)
        
        # Invalid length
        is_valid, _ = validate_ean13('50001126379')
        self.assertFalse(is_valid)
        
        # Non-numeric
        is_valid, _ = validate_ean13('50001126379AB')
        self.assertFalse(is_valid)

    def test_split_ingredients(self):
        """Test ingredient splitting function"""
        # Simple case
        ingredients = split_ingredients("Sugar, Water, Salt")
        self.assertEqual(ingredients, ["Sugar", "Water", "Salt"])
        
        # With parentheses
        ingredients = split_ingredients("Sugar, Water, Salt (Sodium Chloride)")
        self.assertEqual(ingredients, ["Sugar", "Water", "Salt (Sodium Chloride)"])
        
        # Empty input
        ingredients = split_ingredients("")
        self.assertEqual(ingredients, [])

    def test_api_search_invalid_barcode(self):
        """Test API search with invalid barcode"""
        response = self.app.post('/api/search', 
                               json={'barcode': '12345'},
                               content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['success'])
        self.assertTrue('error' in data)

    def test_manual_product_entry(self):
        """Test manual product entry API"""
        test_product = {
            'barcode': '5000112637922',
            'name': 'Test Product',
            'brand': 'Test Brand',
            'ingredients': 'Sugar, Water, Salt'
        }
        
        response = self.app.post('/api/product/manual', 
                               json=test_product,
                               content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertEqual(data['product']['product_name'], 'Test Product')
        self.assertEqual(data['product']['brands'], 'Test Brand')
        self.assertEqual(data['product']['ingredients'], ['Sugar', 'Water', 'Salt'])

if __name__ == '__main__':
    unittest.main()
