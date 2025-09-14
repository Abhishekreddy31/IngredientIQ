import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Paper,
  useTheme,
  Container,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Info as InfoIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  MobileFriendly as MobileIcon,
  People as PeopleIcon
} from '@mui/icons-material';

const AboutPage: React.FC = () => {
  const theme = useTheme();

  const features = [
    {
      title: 'What is IngredientIQ?',
      content: 'IngredientIQ is a powerful tool designed to help you understand what\'s in the products you use and consume every day. By simply scanning a barcode or taking a photo of an ingredient list, you can quickly get detailed information about the ingredients in your products.',
      icon: <InfoIcon fontSize="large" color="primary" />
    },
    {
      title: 'Our Data Sources',
      content: 'IngredientIQ leverages multiple open databases to provide comprehensive product information, including Open Food Facts, Open Beauty Facts, and Open Pet Food Facts. We also use advanced Optical Character Recognition (OCR) technology to extract ingredient information directly from product packaging when database information is not available.',
      icon: <StorageIcon fontSize="large" color="primary" />
    },
    {
      title: 'Privacy & Security',
      content: 'We respect your privacy. IngredientIQ does not store any personal information. Images you upload for OCR processing are used only for that purpose and are not permanently stored.',
      icon: <SecurityIcon fontSize="large" color="primary" />
    },
    {
      title: 'Mobile & Desktop Compatible',
      content: 'IngredientIQ is designed to work seamlessly on both mobile devices and desktop computers. You can use our barcode scanner on your mobile device or manually enter barcodes on any platform.',
      icon: <MobileIcon fontSize="large" color="primary" />
    },
    {
      title: 'Community Contribution',
      content: 'IngredientIQ is made better by community contributions. If you find a product that\'s not in our database, you can help by adding it. Your contributions help make our database more comprehensive for everyone.',
      icon: <PeopleIcon fontSize="large" color="primary" />
    },
    {
      title: 'Technology',
      content: 'Built with modern technologies including React, TypeScript, and Material UI for the frontend, and Python with Flask for the backend. We use Tesseract OCR for image processing and multiple API sources for product lookups.',
      icon: <CodeIcon fontSize="large" color="primary" />
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Paper 
        elevation={0}
        sx={{
          position: 'relative',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          mb: 6,
          pt: 6,
          pb: 6,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              component="h1"
              variant="h2"
              color="inherit"
              gutterBottom
              sx={{ fontWeight: 700 }}
            >
              About IngredientIQ
            </Typography>
            <Typography variant="h5" color="inherit" paragraph>
              Know what's in your food, cosmetics, and pet products
            </Typography>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="md">
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {feature.icon}
                    <Typography variant="h5" component="h2" sx={{ ml: 2 }}>
                      {feature.title}
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {feature.content}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ my: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
            Supported Databases
          </Typography>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StorageIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Open Food Facts" 
                  secondary="A collaborative, free and open database of food products from around the world" 
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <StorageIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Open Beauty Facts" 
                  secondary="For cosmetics and personal care products" 
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <StorageIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Open Pet Food Facts" 
                  secondary="For pet food products" 
                />
              </ListItem>
            </List>
          </Paper>
        </Box>

        <Box sx={{ my: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
            Our Team
          </Typography>
          <Typography variant="body1" paragraph>
            IngredientIQ was created by a team of developers passionate about helping people make informed choices about the products they use. We believe that everyone should have easy access to information about what's in their food, cosmetics, and other products.
          </Typography>
          <Typography variant="body1">
            Our mission is to make ingredient information accessible, understandable, and actionable for everyone. Whether you have allergies, dietary restrictions, or simply want to be more informed about what you're consuming, IngredientIQ is here to help.
          </Typography>
        </Box>

        <Box sx={{ my: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
            Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            We'd love to hear from you! If you have any questions, suggestions, or feedback, please don't hesitate to reach out to us at:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            contact@ingredientiq.com
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutPage;
