import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  QrCodeScanner as ScanIcon, 
  History as HistoryIcon, 
  Person as ProfileIcon, 
  Info as InfoIcon 
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: AppRoute.HOME },
    { text: 'Scan', icon: <ScanIcon />, path: AppRoute.SCAN },
    { text: 'History', icon: <HistoryIcon />, path: AppRoute.HISTORY },
    { text: 'Profile', icon: <ProfileIcon />, path: AppRoute.PROFILE },
    { text: 'About', icon: <InfoIcon />, path: AppRoute.ABOUT },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src="/logo.svg" 
          alt="IngredientIQ Logo" 
          style={{ height: 40 }} 
        />
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
          IngredientIQ
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.contrastText,
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.primary.light + '80',
              },
              borderRadius: 1,
              m: 0.5,
            }}
          >
            <ListItemIcon sx={{ 
              color: location.pathname === item.path 
                ? theme.palette.primary.contrastText 
                : theme.palette.text.primary 
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => navigate(AppRoute.HOME)}
          >
            <img 
              src="/logo.svg" 
              alt="IngredientIQ Logo" 
              style={{ height: 30, marginRight: 8 }} 
            />
            IngredientIQ
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        {drawer}
      </Drawer>

      <Container 
        component="main" 
        maxWidth="lg" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Container>

      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto', 
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} IngredientIQ - Know what's in your food
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
