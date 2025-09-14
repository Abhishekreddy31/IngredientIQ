import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  Alert,
  Paper,
  useTheme,
  Autocomplete,
  Avatar
} from '@mui/material';
import { 
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { UserPreferences } from '../types';

// Common allergens for autocomplete
const commonAllergens = [
  'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 
  'Wheat', 'Soybeans', 'Sesame', 'Mustard', 'Celery', 'Lupin', 
  'Molluscs', 'Sulphites', 'Gluten'
];

// Common ingredients to avoid
const commonIngredientsToAvoid = [
  'Artificial colors', 'High fructose corn syrup', 'MSG', 'Sodium nitrite',
  'Trans fats', 'BHA', 'BHT', 'Artificial sweeteners', 'Carrageenan',
  'Partially hydrogenated oils', 'Sodium benzoate', 'Potassium bromate'
];

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  
  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    allergens: [],
    avoidIngredients: [],
    darkMode: false,
    language: 'en'
  });
  
  // Form state
  const [newAllergen, setNewAllergen] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Load preferences from local storage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse saved preferences', error);
      }
    }
  }, []);
  
  // Save preferences to local storage
  const savePreferences = () => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      setSaveSuccess(true);
      setSaveError(null);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setSaveError('Failed to save preferences. Please try again.');
      setSaveSuccess(false);
    }
  };
  
  // Reset preferences to default
  const resetPreferences = () => {
    const defaultPreferences: UserPreferences = {
      allergens: [],
      avoidIngredients: [],
      darkMode: false,
      language: 'en'
    };
    
    setPreferences(defaultPreferences);
    localStorage.removeItem('userPreferences');
    setSaveSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };
  
  // Add allergen to list
  const addAllergen = () => {
    if (newAllergen && !preferences.allergens.includes(newAllergen)) {
      setPreferences({
        ...preferences,
        allergens: [...preferences.allergens, newAllergen]
      });
      setNewAllergen('');
    }
  };
  
  // Remove allergen from list
  const removeAllergen = (allergen: string) => {
    setPreferences({
      ...preferences,
      allergens: preferences.allergens.filter(item => item !== allergen)
    });
  };
  
  // Add ingredient to avoid list
  const addIngredientToAvoid = () => {
    if (newIngredient && !preferences.avoidIngredients.includes(newIngredient)) {
      setPreferences({
        ...preferences,
        avoidIngredients: [...preferences.avoidIngredients, newIngredient]
      });
      setNewIngredient('');
    }
  };
  
  // Remove ingredient from avoid list
  const removeIngredientToAvoid = (ingredient: string) => {
    setPreferences({
      ...preferences,
      avoidIngredients: preferences.avoidIngredients.filter(item => item !== ingredient)
    });
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setPreferences({
      ...preferences,
      darkMode: !preferences.darkMode
    });
  };
  
  // Change language
  const changeLanguage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences({
      ...preferences,
      language: event.target.value
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Your Profile
      </Typography>
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Preferences saved successfully!
        </Alert>
      )}
      
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* User Profile Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: theme.palette.primary.main,
                  mb: 2
                }}
              >
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
              
              <Typography variant="h5" gutterBottom>
                User Profile
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                Customize your preferences to get personalized results
              </Typography>
              
              <Box sx={{ width: '100%', mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.darkMode} 
                      onChange={toggleDarkMode}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
              </Box>
              
              <Box sx={{ width: '100%', mt: 2 }}>
                <TextField
                  select
                  label="Language"
                  value={preferences.language}
                  onChange={changeLanguage}
                  fullWidth
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </TextField>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Allergens Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Allergens
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Add allergens to highlight them in ingredient lists
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Autocomplete
                  freeSolo
                  options={commonAllergens}
                  value={newAllergen}
                  onChange={(event, newValue) => {
                    setNewAllergen(newValue || '');
                  }}
                  inputValue={newAllergen}
                  onInputChange={(event, newInputValue) => {
                    setNewAllergen(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Add Allergen" 
                      variant="outlined" 
                      fullWidth 
                    />
                  )}
                  sx={{ flexGrow: 1, mr: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={addAllergen}
                  disabled={!newAllergen}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  minHeight: 100,
                  backgroundColor: theme.palette.background.default
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {preferences.allergens.length > 0 ? (
                    preferences.allergens.map((allergen, index) => (
                      <Chip
                        key={index}
                        label={allergen}
                        onDelete={() => removeAllergen(allergen)}
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No allergens added yet
                    </Typography>
                  )}
                </Box>
              </Paper>
            </CardContent>
          </Card>
          
          {/* Ingredients to Avoid Card */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Ingredients to Avoid
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Add ingredients you want to avoid in products
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Autocomplete
                  freeSolo
                  options={commonIngredientsToAvoid}
                  value={newIngredient}
                  onChange={(event, newValue) => {
                    setNewIngredient(newValue || '');
                  }}
                  inputValue={newIngredient}
                  onInputChange={(event, newInputValue) => {
                    setNewIngredient(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Add Ingredient to Avoid" 
                      variant="outlined" 
                      fullWidth 
                    />
                  )}
                  sx={{ flexGrow: 1, mr: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={addIngredientToAvoid}
                  disabled={!newIngredient}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  minHeight: 100,
                  backgroundColor: theme.palette.background.default
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {preferences.avoidIngredients.length > 0 ? (
                    preferences.avoidIngredients.map((ingredient, index) => (
                      <Chip
                        key={index}
                        label={ingredient}
                        onDelete={() => removeIngredientToAvoid(ingredient)}
                        color="secondary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No ingredients added yet
                    </Typography>
                  )}
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={resetPreferences}
          startIcon={<RefreshIcon />}
        >
          Reset to Default
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={savePreferences}
          startIcon={<SaveIcon />}
        >
          Save Preferences
        </Button>
      </Box>
    </Box>
  );
};

export default ProfilePage;
