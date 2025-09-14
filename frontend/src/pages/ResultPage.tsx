import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as BackIcon,
  QrCodeScanner as ScanIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppRoute, Product, OCRResult } from '../types';
import ApiService, { API_URL } from '../services/api';

const ResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const resultType = searchParams.get('type') || '';
  const barcode = searchParams.get('barcode') || '';
  const imageId = searchParams.get('id') || '';
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const theme = useTheme();

  // Fetch data based on result type
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (resultType === 'barcode' && barcode) {
          // Fetch product data by barcode
          const response = await ApiService.lookupBarcode(barcode);
          
          if (response.success && response.data) {
            setProduct(response.data);
          } else {
            setError(response.message || 'Product not found');
            setTimeout(() => navigate(AppRoute.SCAN), 3000);
          }
        } else if (resultType === 'ocr' && imageId) {
          try {
            // First check if we have OCR results in localStorage
            const storedResult = localStorage.getItem('ocrResult');
            if (storedResult) {
              console.log('Found OCR results in localStorage');
              try {
                const parsedResult = JSON.parse(storedResult);
                
                // Create OCR result object from stored data
                const ocrResult: OCRResult = {
                  ingredients: parsedResult.ingredients || [],
                  processing_time: parsedResult.processing_time || 0,
                  image_path: parsedResult.image_path || imageId,
                  success: true
                };
                
                setOcrResult(ocrResult);
                // Clear localStorage after use
                localStorage.removeItem('ocrResult');
                setLoading(false); // Ensure loading is set to false
                return; // Skip the fetch if we have stored results
              } catch (parseError) {
                console.error('Error parsing stored OCR result:', parseError);
                // Continue to fetch from API if parsing fails
              }
            }
            
            // If no stored results, create default result
            const ocrResult: OCRResult = {
              ingredients: [],
              processing_time: 0,
              image_path: imageId,
              success: true
            };
            
            // Fetch the OCR data from the server
            console.log('Fetching OCR result for image:', imageId);
            // Use the exported API_URL to ensure consistent API access
            const apiUrl = `${API_URL}/api/ocr/result?image_path=${imageId}`;
            console.log('API URL:', apiUrl);
            const response = await fetch(apiUrl, {
              credentials: 'include',  // Include cookies for session handling
              headers: {
                'Accept': 'application/json'
              }
            });
            console.log('OCR result response status:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log('OCR result data:', data);
              if (data.success) {
                ocrResult.ingredients = data.ingredients || [];
                ocrResult.processing_time = data.processing_time || 0;
                ocrResult.success = true;
              } else {
                console.error('OCR result error:', data.error);
                throw new Error(data.error || 'Failed to get OCR results');
              }
            } else {
              throw new Error('Failed to fetch OCR results');
            }
            
            setOcrResult(ocrResult);
          } catch (innerErr) {
            console.error('Error fetching OCR results:', innerErr);
            // Don't redirect automatically, just show the error
            setError('Failed to fetch OCR results. Please try again.');
          }
        } else {
          setError('Invalid result type or missing parameters');
          // Don't redirect automatically
        }
      } catch (err) {
        setError('An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resultType, barcode, imageId, navigate]);

  // Toggle bookmark status
  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    // In a real app, you would save this to user preferences
  };

  // Share result
  const shareResult = () => {
    if (navigator.share) {
      navigator.share({
        title: product ? `IngredientIQ: ${product.name}` : 'IngredientIQ Scan Result',
        text: product 
          ? `Check out the ingredients in ${product.name} by ${product.brand}`
          : 'Check out these ingredients I scanned with IngredientIQ',
        url: window.location.href
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard'))
        .catch((error) => console.log('Error copying to clipboard', error));
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">
          {resultType === 'barcode' ? 'Looking up product...' : 'Processing image...'}
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => navigate(AppRoute.SCAN)}
            >
              Try Again
            </Button>
          }
        >
          {error}
        </Alert>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Error Details
            </Typography>
            <Typography variant="body1" paragraph>
              We encountered an issue while processing your request. This could be due to:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><WarningIcon color="error" /></ListItemIcon>
                <ListItemText primary="The image may not contain readable text" />
              </ListItem>
              <ListItem>
                <ListItemIcon><WarningIcon color="error" /></ListItemIcon>
                <ListItemText primary="The server may be experiencing issues" />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
                <ListItemText primary="Try uploading a clearer image with better lighting" />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(AppRoute.SCAN)}
                startIcon={<ScanIcon />}
              >
                Back to Scan
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Back button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(AppRoute.SCAN)}
        sx={{ mb: 3 }}
      >
        Back to Scan
      </Button>

      {/* Product Result */}
      {product && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Typography variant="h4" component="h1">
                  {product.name}
                </Typography>
                <Box>
                  <IconButton 
                    onClick={toggleBookmark}
                    color={bookmarked ? 'primary' : 'default'}
                    aria-label={bookmarked ? 'Remove from saved' : 'Save product'}
                  >
                    {bookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                  <IconButton 
                    onClick={shareResult}
                    aria-label="Share result"
                  >
                    <ShareIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {product.brand}
              </Typography>
              
              <Chip 
                label={`Barcode: ${barcode}`} 
                icon={<ScanIcon />} 
                variant="outlined" 
                sx={{ mb: 2 }}
              />
              
              {product.source_db && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Source: {product.source_db}
                </Typography>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h5" gutterBottom>
                Ingredients
              </Typography>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  backgroundColor: theme.palette.background.default,
                  mb: 3
                }}
              >
                <List dense>
                  {Array.isArray(product.ingredients) && product.ingredients.map((ingredient, index) => {
                    // Handle both string and object ingredients
                    const ingredientText = typeof ingredient === 'string' 
                      ? ingredient 
                      : ingredient.name;
                    
                    const isAllergen = typeof ingredient === 'object' && ingredient.allergen;
                    
                    return (
                      <ListItem 
                        key={index}
                        sx={{
                          borderLeft: isAllergen ? `4px solid ${theme.palette.warning.main}` : 'none',
                          backgroundColor: isAllergen ? theme.palette.warning.light + '20' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isAllergen ? (
                            <WarningIcon color="warning" fontSize="small" />
                          ) : (
                            <CheckIcon color="success" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={ingredientText}
                          primaryTypographyProps={{
                            fontWeight: isAllergen ? 'bold' : 'normal'
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
              
              {product.countries && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Countries:</strong> {product.countries}
                </Typography>
              )}
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<ScanIcon />}
              onClick={() => navigate(AppRoute.SCAN)}
            >
              Scan Another Product
            </Button>
          </Box>
        </>
      )}

      {/* OCR Result */}
      {ocrResult && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Typography variant="h4" component="h1">
                  Extracted Ingredients
                </Typography>
                <Box>
                  <IconButton 
                    onClick={toggleBookmark}
                    color={bookmarked ? 'primary' : 'default'}
                    aria-label={bookmarked ? 'Remove from saved' : 'Save result'}
                  >
                    {bookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                  <IconButton 
                    onClick={shareResult}
                    aria-label="Share result"
                  >
                    <ShareIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Successfully extracted {ocrResult.ingredients.length} ingredients in {ocrResult.processing_time.toFixed(2)} seconds
                </Typography>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" gutterBottom>
                    Ingredients List
                  </Typography>
                  
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: theme.palette.background.default,
                      height: '100%'
                    }}
                  >
                    <List dense>
                      {ocrResult.ingredients.map((ingredient, index) => (
                        <ListItem 
                          key={index}
                          sx={{
                            borderRadius: 1,
                            mb: 0.5
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={ingredient} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" gutterBottom>
                    Processed Image
                  </Typography>
                  
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: theme.palette.background.default,
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {ocrResult.image_path && (
                      <img 
                        src={`/static/uploads/${ocrResult.image_path}`} 
                        alt="Processed ingredient list" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 300, 
                          objectFit: 'contain' 
                        }} 
                      />
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<ScanIcon />}
              onClick={() => navigate(AppRoute.SCAN)}
            >
              Scan Another Image
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ResultPage;
