import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Container,
  Paper,
  useTheme
} from '@mui/material';
import { 
  Home as HomeIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3}
        sx={{
          p: 4,
          mt: 4,
          mb: 4,
          textAlign: 'center',
          borderRadius: 2
        }}
      >
        <Typography 
          variant="h1" 
          color="primary" 
          sx={{ 
            fontSize: '8rem', 
            fontWeight: 'bold',
            mb: 2
          }}
        >
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<HomeIcon />}
            onClick={() => navigate(AppRoute.HOME)}
          >
            Go to Home
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={() => navigate(AppRoute.SCAN)}
          >
            Scan Products
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;
