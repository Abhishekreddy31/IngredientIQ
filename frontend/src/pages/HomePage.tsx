import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  Paper,
  useTheme,
  useMediaQuery,
  Container
} from '@mui/material';
import { 
  QrCodeScanner as ScanIcon, 
  CameraAlt as CameraIcon, 
  FileUpload as UploadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const features = [
    {
      title: 'Barcode Scanning',
      description: 'Quickly scan product barcodes to get detailed ingredient information',
      icon: <ScanIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      action: () => navigate(AppRoute.SCAN)
    },
    {
      title: 'Image Recognition',
      description: 'Take a photo of ingredient lists to analyze them instantly',
      icon: <CameraIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      action: () => navigate(AppRoute.SCAN)
    },
    {
      title: 'Comprehensive Database',
      description: 'Access information from multiple product databases worldwide',
      icon: <SearchIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      action: () => navigate(AppRoute.SCAN)
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Paper 
        elevation={0}
        sx={{
          position: 'relative',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          mb: 4,
          pt: 8,
          pb: 6,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="h1"
                variant="h2"
                color="inherit"
                gutterBottom
                sx={{ fontWeight: 700 }}
              >
                Know What's In Your Food
              </Typography>
              <Typography variant="h5" color="inherit" paragraph>
                Scan barcodes or take photos of ingredient lists to instantly discover what's in your products.
                Perfect for allergies, dietary restrictions, or just being informed.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ 
                    backgroundColor: 'white', 
                    color: theme.palette.primary.main,
                    mr: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }
                  }}
                  startIcon={<ScanIcon />}
                  onClick={() => navigate(AppRoute.SCAN)}
                >
                  Start Scanning
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ 
                    borderColor: 'white', 
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  onClick={() => navigate(AppRoute.ABOUT)}
                >
                  Learn More
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                component="img"
                src="/hero-image.png"
                alt="Product scanning illustration"
                sx={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'contain'
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} sm={4}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: theme.shadows[4]
                },
                cursor: 'pointer'
              }}
              onClick={() => navigate(`${AppRoute.SCAN}?mode=barcode`)}
            >
              <Box 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  backgroundColor: theme.palette.primary.light + '20',
                  color: theme.palette.primary.main
                }}
              >
                <ScanIcon sx={{ fontSize: 60 }} />
              </Box>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography gutterBottom variant="h5" component="h2">
                  Scan Barcode
                </Typography>
                <Typography>
                  Scan a product barcode to get detailed ingredient information
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: theme.shadows[4]
                },
                cursor: 'pointer'
              }}
              onClick={() => navigate(`${AppRoute.SCAN}?mode=camera`)}
            >
              <Box 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  backgroundColor: theme.palette.primary.light + '20',
                  color: theme.palette.primary.main
                }}
              >
                <CameraIcon sx={{ fontSize: 60 }} />
              </Box>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography gutterBottom variant="h5" component="h2">
                  Take Photo
                </Typography>
                <Typography>
                  Capture an image of ingredient list with your camera
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: theme.shadows[4]
                },
                cursor: 'pointer'
              }}
              onClick={() => navigate(`${AppRoute.SCAN}?mode=upload`)}
            >
              <Box 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  backgroundColor: theme.palette.primary.light + '20',
                  color: theme.palette.primary.main
                }}
              >
                <UploadIcon sx={{ fontSize: 60 }} />
              </Box>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography gutterBottom variant="h5" component="h2">
                  Upload Image
                </Typography>
                <Typography>
                  Upload an existing photo of ingredient list
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
          Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item key={index} xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="h2" align="center">
                    {feature.title}
                  </Typography>
                  <Typography align="center">
                    {feature.description}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={feature.action}
                  >
                    Try Now
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default HomePage;
