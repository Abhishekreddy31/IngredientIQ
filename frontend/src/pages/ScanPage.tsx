import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  TextField, 
  Button, 
  CircularProgress,
  useTheme,
  Alert,
  IconButton,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { 
  QrCodeScanner as ScanIcon, 
  CameraAlt as CameraIcon, 
  FileUpload as UploadIcon,
  Search as SearchIcon,
  FlipCameraAndroid as FlipCameraIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScanType } from '../types';
import ApiService from '../services/api';
import Quagga from 'quagga';

const ScanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'barcode';
  const [activeTab, setActiveTab] = useState<ScanType>(
    initialMode === 'camera' ? ScanType.CAMERA :
    initialMode === 'upload' ? ScanType.IMAGE :
    ScanType.BARCODE
  );
  
  const [barcode, setBarcode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: ScanType) => {
    setActiveTab(newValue);
    
    // Reset states when changing tabs
    setBarcode('');
    setError(null);
    stopCamera();
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Handle barcode input change
  const handleBarcodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(event.target.value);
    setError(null);
  };

  // Handle barcode search
  const handleBarcodeSearch = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.lookupBarcode(barcode.trim());
      
      if (response.success && response.data) {
        // Navigate to result page with data
        navigate(`/result?type=barcode&barcode=${barcode.trim()}`);
      } else {
        setError(response.message || 'Product not found');
      }
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize barcode scanner
  const initBarcodeScanner = () => {
    if (!scannerRef.current) return;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment",
          width: 640,
          height: 480,
          aspectRatio: 1.5
        },
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"],
        debug: {
          drawBoundingBox: true,
          drawScanline: true,
          showPattern: true
        }
      },
      locate: true
    }, (err) => {
      if (err) {
        setCameraError('Could not initialize camera. Please check permissions.');
        return;
      }
      
      Quagga.start();
      setCameraActive(true);
      setCameraError(null);
      
      // Add detection event listener
      Quagga.onDetected(handleBarcodeDetected);
    });
  };

  // Handle barcode detection
  const handleBarcodeDetected = (result: any) => {
    if (result && result.codeResult) {
      const code = result.codeResult.code;
      
      // Stop scanner and process the barcode
      Quagga.stop();
      setCameraActive(false);
      
      // Search for the detected barcode
      setBarcode(code);
      handleBarcodeSearch();
    }
  };

  // Start camera for barcode scanning
  const startCamera = () => {
    setCameraError(null);
    initBarcodeScanner();
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraActive) {
      Quagga.stop();
      setCameraActive(false);
    }
  };

  // Handle file selection for image upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Handle image upload for OCR processing
  const handleImageUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.processImage(selectedFile);
      console.log('OCR processing response:', response);
      
      if (response.success) {
        // Store OCR results in localStorage for immediate access
        localStorage.setItem('ocrResult', JSON.stringify(response.data));
        
        // Navigate to result page with OCR data
        navigate(`/result?type=ocr&id=${response.data.image_path}`);
      } else {
        setError(response.message || 'Failed to process image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError('An error occurred while processing the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle camera capture for OCR
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to capture image');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await ApiService.processCameraImage(blob);
        console.log('Camera OCR processing response:', response);
        
        if (response.success) {
          // Store OCR results in localStorage for immediate access
          localStorage.setItem('ocrResult', JSON.stringify(response.data));
          
          // Navigate to result page with OCR data
          navigate(`/result?type=ocr&id=${response.data.image_path}`);
        } else {
          setError(response.message || 'Failed to process image');
        }
      } catch (err) {
        console.error('Camera capture error:', err);
        setError('An error occurred while processing the image. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg', 0.95);
  };

  // Start camera for OCR
  const startCameraForOCR = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      setCameraError('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera for OCR
  const stopCameraForOCR = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();
    
    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopCameraForOCR();
      
      // Revoke object URL for preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Scan Products
      </Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="scan methods tabs"
        >
          <Tab 
            icon={<ScanIcon />} 
            label="Barcode" 
            value={ScanType.BARCODE}
            id="tab-barcode"
            aria-controls="tabpanel-barcode"
          />
          <Tab 
            icon={<CameraIcon />} 
            label="Camera" 
            value={ScanType.CAMERA}
            id="tab-camera"
            aria-controls="tabpanel-camera"
          />
          <Tab 
            icon={<UploadIcon />} 
            label="Upload" 
            value={ScanType.IMAGE}
            id="tab-upload"
            aria-controls="tabpanel-upload"
          />
        </Tabs>
      </Paper>

      {/* Error display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Barcode Tab Panel */}
      <Box
        role="tabpanel"
        hidden={activeTab !== ScanType.BARCODE}
        id="tabpanel-barcode"
        aria-labelledby="tab-barcode"
        sx={{ mb: 4 }}
      >
        {activeTab === ScanType.BARCODE && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enter Product Barcode
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Enter the 13-digit EAN barcode found on the product packaging
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <TextField
                  fullWidth
                  label="Barcode"
                  variant="outlined"
                  value={barcode}
                  onChange={handleBarcodeChange}
                  placeholder="e.g. 5000112637922"
                  disabled={loading}
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBarcodeSearch}
                  disabled={loading || !barcode.trim()}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Camera Tab Panel */}
      <Box
        role="tabpanel"
        hidden={activeTab !== ScanType.CAMERA}
        id="tabpanel-camera"
        aria-labelledby="tab-camera"
        sx={{ mb: 4 }}
      >
        {activeTab === ScanType.CAMERA && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scan with Camera
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Point your camera at the product barcode to scan it automatically
              </Typography>
              
              {cameraError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {cameraError}
                </Alert>
              )}
              
              <Box 
                sx={{ 
                  position: 'relative',
                  height: 300,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  overflow: 'hidden',
                  mb: 2
                }}
              >
                <div 
                  ref={scannerRef} 
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />
                
                {!cameraActive && (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%'
                    }}
                  >
                    <CameraIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Camera preview will appear here
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                {!cameraActive ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startCamera}
                    disabled={loading}
                    startIcon={<CameraIcon />}
                  >
                    Start Camera
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={stopCamera}
                    disabled={loading}
                    startIcon={<CloseIcon />}
                  >
                    Stop Camera
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Upload Tab Panel */}
      <Box
        role="tabpanel"
        hidden={activeTab !== ScanType.IMAGE}
        id="tabpanel-upload"
        aria-labelledby="tab-upload"
        sx={{ mb: 4 }}
      >
        {activeTab === ScanType.IMAGE && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Ingredient Image
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload a clear image of the ingredient list from product packaging
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      border: `1px dashed ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 250,
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#f0f0f0',
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Selected ingredient list" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain' 
                        }} 
                      />
                    ) : (
                      <>
                        <UploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body1">
                          Click to select an image
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          or drag and drop here
                        </Typography>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Image Requirements
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Clear, well-lit image of ingredient list
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Text should be readable and not blurry
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Avoid glare or shadows on the text
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={handleImageUpload}
                        disabled={loading || !selectedFile}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                        sx={{ height: '48px' }} // Fixed height to prevent UI glitch
                      >
                        {loading ? 'Processing...' : 'Upload & Process'}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Or Take a Photo
                </Typography>
                
                <Box 
                  sx={{ 
                    position: 'relative',
                    height: 300,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 2
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: cameraActive ? 'block' : 'none'
                    }}
                  />
                  
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  
                  {!cameraActive && (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <PhotoCameraIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Camera preview will appear here
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  {!cameraActive ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={startCameraForOCR}
                      disabled={loading}
                      startIcon={<CameraIcon />}
                    >
                      Start Camera
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={captureImage}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon />}
                      >
                        {loading ? 'Processing...' : 'Capture'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={stopCameraForOCR}
                        disabled={loading}
                        startIcon={<CloseIcon />}
                      >
                        Stop Camera
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default ScanPage;
