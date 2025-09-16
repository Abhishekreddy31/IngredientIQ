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
  IconButton,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import { 
  ArrowBack as BackIcon,
  QrCodeScanner as ScanIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Science as ScienceIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppRoute, Product } from '../types';

// Define types for OCR results
interface Ingredient {
  name: string;
  allergen?: boolean;
}

type IngredientType = string | Ingredient;

interface OCRResult {
  ingredients: IngredientType[];
  processing_time: number;
  image_path: string;
  success?: boolean; // Optional success flag for API responses
}
import ApiService, { API_URL, IngredientAnalysisResult, AnalysisResponse } from '../services/api';

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
  
  // States for ingredient analysis
  const [analyzingIngredients, setAnalyzingIngredients] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<IngredientAnalysisResult[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientAnalysisResult | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState<boolean>(false);
  
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
  
  // Analyze ingredients
  const handleAnalyzeIngredients = async () => {
    // Check if we have product ingredients or OCR ingredients
    const ingredientsToAnalyze = product?.ingredients || ocrResult?.ingredients;
    
    if (!ingredientsToAnalyze || !Array.isArray(ingredientsToAnalyze) || ingredientsToAnalyze.length === 0) {
      setAnalysisError('No ingredients to analyze');
      return;
    }
    
    setAnalyzingIngredients(true);
    setAnalysisError(null);
    
    try {
      // Extract ingredient text from product or OCR result
      const ingredientsList = ingredientsToAnalyze.map(ingredient => {
        return typeof ingredient === 'string' ? ingredient : ingredient.name;
      });
      
      // Call the API service to analyze ingredients
      const response = await ApiService.analyzeIngredients(ingredientsList);
      
      if (response.success && response.data.success) {
        setAnalysisResults(response.data.ingredients);
      } else {
        setAnalysisError(response.message || 'Failed to analyze ingredients');
      }
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      setAnalysisError('An unexpected error occurred during analysis');
    } finally {
      setAnalyzingIngredients(false);
    }
  };
  
  // Handle opening analysis details modal
  const handleOpenAnalysisDetails = (ingredient: IngredientAnalysisResult) => {
    setSelectedIngredient(ingredient);
    setAnalysisModalOpen(true);
  };
  
  // Debug effect to log OCR and analysis results
  useEffect(() => {
    if (ocrResult) {
      console.log('OCR Ingredients:', ocrResult.ingredients);
      console.log('Analysis Results:', analysisResults);
    }
  }, [ocrResult, analysisResults]);

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
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  Ingredients
                </Typography>
                
                {!analyzingIngredients && !analysisResults && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<ScienceIcon />}
                    onClick={handleAnalyzeIngredients}
                    disabled={analyzingIngredients}
                  >
                    Analyze Ingredients
                  </Button>
                )}
              </Box>
              
              {analyzingIngredients && (
                <Box sx={{ width: '100%', mb: 3 }}>
                  <LinearProgress color="secondary" />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    Analyzing ingredients...
                  </Typography>
                </Box>
              )}
              
              {analysisError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {analysisError}
                </Alert>
              )}
              
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
                    
                    // Find analysis result for this ingredient if available
                    const analysis = analysisResults?.find(a => {
                      if (!a?.name) return false;
                      return (
                        a.name.toLowerCase() === ingredientText.toLowerCase() || 
                        ingredientText.toLowerCase().includes(a.name.toLowerCase()) ||
                        a.name.toLowerCase().includes(ingredientText.toLowerCase()) ||
                        a.name.toLowerCase().split(' ').some(word => 
                          ingredientText.toLowerCase().includes(word)
                        )
                      );
                    });
                    
                    // Determine icon and color based on analysis
                    let icon = <CheckIcon color="success" fontSize="small" />;
                    let borderColor = 'none';
                    let bgColor = 'transparent';
                    let fontWeight = 'normal';
                    
                    if (isAllergen) {
                      icon = <WarningIcon color="warning" fontSize="small" />;
                      borderColor = `4px solid ${theme.palette.warning.main}`;
                      bgColor = theme.palette.warning.light + '20';
                      fontWeight = 'bold';
                    } else if (analysis) {
                      if (analysis.safety_level === 'caution') {
                        icon = <WarningIcon color="warning" fontSize="small" />;
                        borderColor = `4px solid ${theme.palette.warning.main}`;
                        bgColor = theme.palette.warning.light + '20';
                      } else if (analysis.safety_level === 'avoid') {
                        icon = <ThumbDownIcon color="error" fontSize="small" />;
                        borderColor = `4px solid ${theme.palette.error.main}`;
                        bgColor = theme.palette.error.light + '20';
                        fontWeight = 'bold';
                      } else if (analysis.safety_level === 'unknown') {
                        icon = <HelpIcon color="action" fontSize="small" />;
                      }
                    }
                    
                    return (
                      <ListItem 
                        key={index}
                        sx={{
                          borderLeft: borderColor,
                          backgroundColor: bgColor,
                          borderRadius: 1,
                          mb: 0.5
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={ingredientText}
                          primaryTypographyProps={{
                            fontWeight: fontWeight,
                            color: analysis ? 'text.primary' : 'text.secondary'
                          }}
                          secondary={analysis?.safety_level ? `Safety: ${analysis.safety_level}` : 'Not analyzed'}
                        />
                        
                        <Tooltip title={analysis ? "View details" : "No analysis available"}>
                          <span>
                            <IconButton 
                              size="small" 
                              onClick={() => analysis && handleOpenAnalysisDetails(analysis)}
                              disabled={!analysis}
                            >
                              <InfoIcon 
                                fontSize="small" 
                                color={analysis ? "primary" : "disabled"}
                              />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
              
              {/* Analysis Results Details */}
              {analysisResults && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ingredient Analysis Summary
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      {/* Safe Ingredients */}
                      <Grid item xs={4}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: theme.palette.success.light + '30',
                            borderRadius: 2
                          }}
                        >
                          <Badge 
                            badgeContent={analysisResults.filter(i => i.safety_level === 'safe').length} 
                            color="success"
                            max={99}
                            sx={{ width: '100%' }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <CheckIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                              <Typography variant="body2" fontWeight="bold">
                                Safe Ingredients
                              </Typography>
                            </Box>
                          </Badge>
                        </Paper>
                      </Grid>
                      
                      {/* Caution Ingredients */}
                      <Grid item xs={4}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: theme.palette.warning.light + '30',
                            borderRadius: 2
                          }}
                        >
                          <Badge 
                            badgeContent={analysisResults.filter(i => i.safety_level === 'caution').length} 
                            color="warning"
                            max={99}
                            sx={{ width: '100%' }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <WarningIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                              <Typography variant="body2" fontWeight="bold">
                                Use with Caution
                              </Typography>
                            </Box>
                          </Badge>
                        </Paper>
                      </Grid>
                      
                      {/* Avoid Ingredients */}
                      <Grid item xs={4}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            backgroundColor: theme.palette.error.light + '30',
                            borderRadius: 2
                          }}
                        >
                          <Badge 
                            badgeContent={analysisResults.filter(i => i.safety_level === 'avoid').length} 
                            color="error"
                            max={99}
                            sx={{ width: '100%' }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <ThumbDownIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
                              <Typography variant="body2" fontWeight="bold">
                                Better Avoid
                              </Typography>
                            </Box>
                          </Badge>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    {/* Detailed Analysis */}
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                      Detailed Analysis
                    </Typography>
                    
                    {analysisResults.filter(item => item.concerns.length > 0 || item.benefits.length > 0).map((item, index) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            {item.safety_level === 'safe' && <CheckIcon color="success" sx={{ mr: 1 }} />}
                            {item.safety_level === 'caution' && <WarningIcon color="warning" sx={{ mr: 1 }} />}
                            {item.safety_level === 'avoid' && <ThumbDownIcon color="error" sx={{ mr: 1 }} />}
                            {item.safety_level === 'unknown' && <HelpIcon color="action" sx={{ mr: 1 }} />}
                            
                            <Typography fontWeight={item.safety_level === 'avoid' ? 'bold' : 'normal'}>
                              {item.name}
                            </Typography>
                            
                            {item.health_score !== null && (
                              <Chip 
                                label={`Health: ${item.health_score}`} 
                                size="small" 
                                color={item.health_score > 70 ? 'success' : item.health_score > 40 ? 'warning' : 'error'}
                                sx={{ ml: 'auto', mr: 2 }}
                              />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {item.concerns.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="error">
                                Concerns:
                              </Typography>
                              <List dense>
                                {item.concerns.map((concern, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      <ThumbDownIcon color="error" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={concern} />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                          
                          {item.benefits.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" color="success.main">
                                Benefits:
                              </Typography>
                              <List dense>
                                {item.benefits.map((benefit, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      <ThumbUpIcon color="success" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={benefit} />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              )}
              
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
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Successfully extracted {ocrResult.ingredients.length} ingredients in {ocrResult.processing_time.toFixed(2)} seconds
                  </Typography>
                </Box>
                
                {!analyzingIngredients && !analysisResults && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<ScienceIcon />}
                    onClick={handleAnalyzeIngredients}
                    disabled={analyzingIngredients}
                    size="small"
                  >
                    Analyze Ingredients
                  </Button>
                )}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">
                      Ingredients List
                    </Typography>
                    
                    {!analyzingIngredients && !analysisResults && ocrResult.ingredients.length > 0 && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<ScienceIcon />}
                        onClick={handleAnalyzeIngredients}
                        disabled={analyzingIngredients}
                        size="small"
                      >
                        Analyze
                      </Button>
                    )}
                  </Box>
                  
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: theme.palette.background.default,
                      height: '100%'
                    }}
                  >
                    {analyzingIngredients && (
                      <Box sx={{ width: '100%', mb: 3 }}>
                        <LinearProgress color="secondary" />
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                          Analyzing ingredients...
                        </Typography>
                      </Box>
                    )}
                    
                    {analysisError && (
                      <Alert severity="error" sx={{ mb: 3 }}>
                        {analysisError}
                      </Alert>
                    )}
                    
                    <List dense>
                      {ocrResult.ingredients.map((ingredient, index) => {
                        const ingredientText = typeof ingredient === 'string' ? ingredient : ingredient.name;
                        
                        // Find analysis result for this ingredient if available
                        let analysis: IngredientAnalysisResult | undefined;
                        
                        if (analysisResults) {
                          analysis = analysisResults.find(a => {
                            if (!a?.name) return false;
                            
                            const analysisName = a.name.toLowerCase().trim();
                            const ingredientLower = ingredientText.toLowerCase().trim();
                            
                            // Skip empty strings
                            if (!analysisName || !ingredientLower) return false;
                            
                            // Exact match
                            if (analysisName === ingredientLower) return true;
                            
                            // Partial matches
                            if (ingredientLower.includes(analysisName) || 
                                analysisName.includes(ingredientLower)) {
                              return true;
                            }
                            
                            // Word-by-word matching
                            const analysisWords = analysisName.split(/[\s,;.]+/).filter(Boolean);
                            const ingredientWords = ingredientLower.split(/[\s,;.]+/).filter(Boolean);
                            
                            // Check if any word from analysis is in ingredient or vice versa
                            return analysisWords.some(aw => 
                              ingredientWords.some(iw => 
                                iw.includes(aw) || aw.includes(iw)
                              )
                            );
                          });
                        }
                        
                        // Debug logging for matching
                        if (analysis) {
                          console.log(`Matched: ${ingredientText} -> ${analysis.name} (${analysis.safety_level})`);
                        }
                        
                        // Determine icon and color based on analysis
                        let icon = <CheckIcon color="success" fontSize="small" />;
                        let borderColor = 'none';
                        let bgColor = 'transparent';
                        let fontWeight = 'normal';
                        
                        if (analysis) {
                          if (analysis.safety_level === 'caution') {
                            icon = <WarningIcon color="warning" fontSize="small" />;
                            borderColor = `4px solid ${theme.palette.warning.main}`;
                            bgColor = theme.palette.warning.light + '20';
                          } else if (analysis.safety_level === 'avoid') {
                            icon = <ThumbDownIcon color="error" fontSize="small" />;
                            borderColor = `4px solid ${theme.palette.error.main}`;
                            bgColor = theme.palette.error.light + '20';
                            fontWeight = 'bold';
                          } else if (analysis.safety_level === 'unknown') {
                            icon = <HelpIcon color="action" fontSize="small" />;
                          }
                        }
                        
                        return (
                          <ListItem 
                            key={index}
                            sx={{
                              borderLeft: borderColor,
                              backgroundColor: bgColor,
                              borderRadius: 1,
                              mb: 0.5
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {icon}
                            </ListItemIcon>
                            <ListItemText 
                              primary={ingredientText}
                              primaryTypographyProps={{
                                fontWeight: fontWeight,
                                color: analysis ? 'text.primary' : 'text.secondary'
                              }}
                              secondary={analysis?.safety_level ? `Safety: ${analysis.safety_level}` : 'Not analyzed'}
                            />
                            
                            <Tooltip title={analysis ? "View details" : "No analysis available"}>
                              <span>
                                <IconButton 
                                  size="small" 
                                  onClick={() => analysis && handleOpenAnalysisDetails(analysis)}
                                  disabled={!analysis}
                                >
                                  <InfoIcon 
                                    fontSize="small" 
                                    color={analysis ? "primary" : "disabled"}
                                  />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </ListItem>
                        );
                      })}
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
                      alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {ocrResult.image_path && (
                      <img 
                        src={`${API_URL}/uploads/${ocrResult.image_path}`} 
                        alt="Processed ingredient list" 
                        style={{ 
                          maxWidth: '100%', 
                          height: 'auto', 
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          marginBottom: '16px',
                          maxHeight: '400px',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
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
