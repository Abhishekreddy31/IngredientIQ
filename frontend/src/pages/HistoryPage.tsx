import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Paper,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  QrCodeScanner as BarcodeIcon,
  Image as ImageIcon,
  Visibility as ViewIcon,
  DeleteSweep as ClearAllIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ScanResult, ScanType, AppRoute } from '../types';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ScanResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ScanResult | null>(null);
  
  const navigate = useNavigate();
  const theme = useTheme();

  // Load history from local storage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('scanHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
        setFilteredHistory(parsedHistory);
      } catch (error) {
        console.error('Failed to parse saved history', error);
      }
    }
  }, []);

  // Filter history based on active filter
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(history.filter(item => item.type === activeFilter));
    }
  }, [activeFilter, history]);

  // Handle filter change
  const handleFilterChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveFilter(newValue);
  };

  // Format date from timestamp
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Delete a history item
  const deleteHistoryItem = (item: ScanResult) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  // Confirm delete of history item
  const confirmDelete = () => {
    if (selectedItem) {
      const newHistory = history.filter(item => 
        !(item.timestamp === selectedItem.timestamp && 
          item.type === selectedItem.type)
      );
      
      setHistory(newHistory);
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
      setDeleteDialogOpen(false);
    }
  };

  // Clear all history
  const clearAllHistory = () => {
    setClearAllDialogOpen(true);
  };

  // Confirm clear all history
  const confirmClearAll = () => {
    setHistory([]);
    localStorage.removeItem('scanHistory');
    setClearAllDialogOpen(false);
  };

  // View a history item
  const viewHistoryItem = (item: ScanResult) => {
    if (item.type === 'barcode') {
      // Navigate to result page with barcode data
      const product = item.data as any; // Type assertion for simplicity
      navigate(`/result?type=barcode&barcode=${product.barcode}`);
    } else if (item.type === 'ocr') {
      // Navigate to result page with OCR data
      const ocrResult = item.data as any; // Type assertion for simplicity
      navigate(`/result?type=ocr&id=${ocrResult.image_path}`);
    }
  };

  // Generate mock history data for demonstration
  const generateMockHistory = () => {
    const mockHistory: ScanResult[] = [
      {
        type: 'barcode',
        data: {
          barcode: '5000112637922',
          name: 'Nutella',
          brand: 'Ferrero',
          ingredients: [
            'Sugar',
            'Palm Oil',
            'Hazelnuts (13%)',
            'Skimmed Milk Powder (8.7%)',
            'Fat-reduced Cocoa (7.4%)',
            'Emulsifier (Lecithins)',
            'Vanillin'
          ],
          countries: 'United Kingdom'
        },
        timestamp: Date.now() - 3600000 // 1 hour ago
      },
      {
        type: 'ocr',
        data: {
          ingredients: [
            'Water',
            'Sugar',
            'Natural Flavors',
            'Citric Acid',
            'Sodium Citrate',
            'Potassium Sorbate',
            'Sucralose',
            'Acesulfame Potassium'
          ],
          processing_time: 0.47,
          image_path: 'test.jpg',
          success: true
        },
        timestamp: Date.now() - 7200000 // 2 hours ago
      },
      {
        type: 'barcode',
        data: {
          barcode: '5449000000996',
          name: 'Coca-Cola',
          brand: 'Coca-Cola',
          ingredients: [
            'Carbonated Water',
            'High Fructose Corn Syrup',
            'Caramel Color',
            'Phosphoric Acid',
            'Natural Flavors',
            'Caffeine'
          ],
          countries: 'United States'
        },
        timestamp: Date.now() - 86400000 // 1 day ago
      }
    ];
    
    setHistory(mockHistory);
    localStorage.setItem('scanHistory', JSON.stringify(mockHistory));
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4
      }}>
        <Typography variant="h4" gutterBottom>
          Scan History
        </Typography>
        
        <Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ClearAllIcon />}
            onClick={clearAllHistory}
            disabled={history.length === 0}
            sx={{ mr: 1 }}
          >
            Clear All
          </Button>
          
          {history.length === 0 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={generateMockHistory}
            >
              Generate Demo Data
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeFilter}
          onChange={handleFilterChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All" value="all" />
          <Tab label="Barcodes" value="barcode" />
          <Tab label="OCR Scans" value="ocr" />
        </Tabs>
      </Paper>

      {filteredHistory.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No scan history found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your scan history will appear here after you scan products or ingredient lists.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(AppRoute.SCAN)}
          >
            Start Scanning
          </Button>
        </Paper>
      ) : (
        <Card>
          <List>
            {filteredHistory.map((item, index) => (
              <React.Fragment key={`${item.type}-${item.timestamp}`}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemIcon>
                    {item.type === 'barcode' ? (
                      <BarcodeIcon color="primary" />
                    ) : (
                      <ImageIcon color="secondary" />
                    )}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      item.type === 'barcode'
                        ? (item.data as any).name || 'Product'
                        : 'Ingredient List Scan'
                    }
                    secondary={formatDate(item.timestamp)}
                  />
                  
                  <ListItemSecondaryAction>
                    <Chip 
                      label={item.type === 'barcode' ? 'Barcode' : 'OCR'} 
                      size="small"
                      color={item.type === 'barcode' ? 'primary' : 'secondary'}
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    
                    <IconButton 
                      edge="end" 
                      aria-label="view"
                      onClick={() => viewHistoryItem(item)}
                      sx={{ mr: 1 }}
                    >
                      <ViewIcon />
                    </IconButton>
                    
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => deleteHistoryItem(item)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete History Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this item from your scan history?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
      >
        <DialogTitle>Clear All History</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear your entire scan history? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmClearAll} color="error">Clear All</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryPage;
