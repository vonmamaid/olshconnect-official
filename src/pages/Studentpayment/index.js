import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import axios from 'axios';
import { PhotoCamera } from '@mui/icons-material';
import { FaPrint } from 'react-icons/fa';
import officialolshcologo from '../../asset/images/officialolshcologo.png';
import { Snackbar, Alert } from '@mui/material';

const escapeHtml = (value) => {
  const stringValue = value == null ? '' : String(value);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    return JSON.parse(atob(parts[1]));
  } catch (err) {
    return null;
  }
};

// Honeypot monitoring system for payment page
const PaymentHoneypotMonitor = {
  suspiciousActivities: [],
  sessionStartTime: Date.now(),
  commandCount: 0,

  resetSession: () => {
    PaymentHoneypotMonitor.suspiciousActivities = [];
    PaymentHoneypotMonitor.commandCount = 0;
    PaymentHoneypotMonitor.sessionStartTime = Date.now();
  },
  
  logActivity: async (type, details) => {
    const safeDetails = {
      action: details?.action || 'N/A',
      fileName: details?.fileName || 'N/A',
      fileType: details?.fileType || 'N/A',
      fileSize: details?.fileSize || 'N/A',
      vulnerabilityType: details?.vulnerabilityType || type,
      honeypotPath: details?.honeypotPath || '/fake_receipt_form',
      httpMethod: details?.httpMethod || 'POST',
      port: details?.port || '443',
      protocol: details?.protocol || 'HTTPS'
    };

    const activity = {
      timestamp: new Date().toISOString(),
      type,
      details: safeDetails,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    PaymentHoneypotMonitor.suspiciousActivities.push(activity);
    PaymentHoneypotMonitor.commandCount++;
    
    // Calculate session duration
    const sessionDuration = Math.floor((Date.now() - PaymentHoneypotMonitor.sessionStartTime) / 1000);
    
    // Format timestamp for log file
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    
    // Create detailed log entry
    const logEntry = `
=== PAYMENT HONEYPOT LOG ENTRY ===
Visitor IP Address: ${details.ipAddress || 'Unknown'}

Timestamp: ${timestamp}

Requested URL or Endpoint: ${window.location.pathname}

HTTP Method: ${safeDetails.httpMethod}

User-Agent: ${navigator.userAgent}

Referrer: ${document.referrer || '(none)'}

Uploaded File Info: Filename: ${safeDetails.fileName}, Size: ${safeDetails.fileSize} bytes, Type: ${safeDetails.fileType}

Port Accessed: ${safeDetails.port}

Protocol Used: ${safeDetails.protocol}

Session Duration: Connected for ${sessionDuration} seconds

Number of Commands Issued: Commands: ${PaymentHoneypotMonitor.commandCount}

Detected Vulnerability Attempt: ${safeDetails.vulnerabilityType}

Honeypot Path Accessed: ${safeDetails.honeypotPath}

Activity Type: ${type}
Action: ${safeDetails.action}
Additional Metadata: ${JSON.stringify(safeDetails, null, 2)}

=== END LOG ENTRY ===

`;
    
    // Send to payment log file
    try {
      console.log('📝 Sending log to payment-log API:', { activityType: type, timestamp });
      await axios.post('/api/payment-log', {
        logEntry,
        timestamp,
        activityType: type,
        ...safeDetails
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Payment logging failed:', err);
    }
    
    console.warn('🚨 PAYMENT HONEYPOT TRIGGERED:', activity);
  },
  
  detectMaliciousFile: (file) => {
    if (!file) return false;
    
    // TEMPORARILY DISABLED FOR TESTING - Allow PHP files
    // const dangerousExtensions = [
    //   '.php', '.php3', '.php4', '.php5', '.phtml', 
    //   '.asp', '.aspx', '.jsp', '.jspx', 
    //   '.sh', '.bash', '.py', '.pl', '.rb', 
    //   '.exe', '.bat', '.cmd', '.com', '.dll',
    //   '.js', '.vbs', '.ps1', '.jar'
    // ];
    
    // For testing - only block the most dangerous files
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.dll',
      '.js', '.vbs', '.ps1', '.jar'
    ];
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    return dangerousExtensions.includes(fileExtension);
  }
};

const StudentPayment = () => {
  // Check localStorage cache synchronously on mount (like Academic Records)
  const cachedPaymentData = localStorage.getItem('paymentData');
  const cachedPaymentTimestamp = localStorage.getItem('paymentDataTimestamp');
  const cachedPaymentAge = cachedPaymentTimestamp ? Date.now() - parseInt(cachedPaymentTimestamp) : null;
  const hasValidPaymentCache = cachedPaymentData && cachedPaymentAge && cachedPaymentAge < 300000; // 5 minutes

  // Initialize state with cached data if available, otherwise empty
  const cachedPayment = hasValidPaymentCache ? JSON.parse(cachedPaymentData) : null;
  const [payments, setPayments] = useState(cachedPayment ? [cachedPayment] : []);
  const [loading, setLoading] = useState(!hasValidPaymentCache); // Only show loading if no valid cache
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(cachedPayment?.remaining_balance || 0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  
  const [openVerifyDialog, setOpenVerifyDialog] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);

  // Honeypot states
  const [showFakeReceiptDialog, setShowFakeReceiptDialog] = useState(false);
  const [fakeReceiptImage, setFakeReceiptImage] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Honeypot handlers
  const handleFakeReceiptOpen = async () => {
    setShowFakeReceiptDialog(true);
    
    await PaymentHoneypotMonitor.logActivity('fake_receipt_dialog_opened', {
      honeypotPath: '/fake_receipt_form',
      action: 'open'
    });
  };

  const handleFakeReceiptClose = () => {
    setShowFakeReceiptDialog(false);
    setFakeReceiptImage(null);
  };

  const handleFakeReceiptSubmit = async () => {
    await PaymentHoneypotMonitor.logActivity('fake_receipt_form_submitted', {
      fileName: fakeReceiptImage?.name,
      fileType: fakeReceiptImage?.type,
      fileSize: fakeReceiptImage?.size,
      honeypotPath: '/fake_receipt_form',
      action: 'submit'
    });
    
    // Simulate processing delay
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: "Receipt uploaded successfully! Please wait for verification.",
        severity: 'success'
      });
      handleFakeReceiptClose();
    }, 2000);
  };

  const handleFakeReceiptFileChange = async (e) => {
    const file = e.target.files[0];
    setFakeReceiptImage(file);
    
    // Log file selection in honeypot
    if (file) {
      await PaymentHoneypotMonitor.logActivity('fake_receipt_file_selected', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        honeypotPath: '/fake_receipt_form',
        action: 'file_selected'
      });
    }
  };

  const handleReceiptSubmit = async () => {
    try {
      if (!receiptImage) {
        setSnackbar({
          open: true,
          message: 'Please select a receipt image to upload',
          severity: 'error'
        });
        return;
      }
      
      // 🚨 HONEYPOT: Check for malicious file upload (including PHP files for testing)
      const fileName = receiptImage.name.toLowerCase();
      const isPhpFile = fileName.endsWith('.php') || fileName.endsWith('.php3') || fileName.endsWith('.php4') || fileName.endsWith('.php5') || fileName.endsWith('.phtml');
      
      if (PaymentHoneypotMonitor.detectMaliciousFile(receiptImage) || isPhpFile) {
        await PaymentHoneypotMonitor.logActivity('malicious_file_upload', {
          field: 'receipt_image',
          fileName: receiptImage.name,
          fileType: receiptImage.type,
          fileSize: receiptImage.size,
          fileInfo: `Filename: ${receiptImage.name}, Size: ${receiptImage.size} bytes, Type: ${receiptImage.type}`,
          vulnerabilityType: isPhpFile ? 'PHP File Upload Attack' : 'File Upload Attack',
          honeypotPath: '/fake_receipt_form',
          action: 'redirect_to_honeypot'
        });
        
        // Close real dialog and open fake dialog
        setOpenVerifyDialog(false);
        setReceiptImage(null);
        handleFakeReceiptOpen();
        return;
      }
      
      const formData = new FormData();
      formData.append('receipt_image', receiptImage);
      
      const token = localStorage.getItem('token');
      await axios.put('/api/enrollment-payment', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setOpenVerifyDialog(false);
      setReceiptImage(null);
      setSnackbar({
        open: true,
        message: 'Receipt uploaded successfully! Please wait for verification.',
        severity: 'success'
      });
      
      // Force refresh to get updated payment data after receipt upload
      fetchPayments(true);
      fetchPaymentHistory();
    } catch (error) {
      console.error('Upload Error:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.details || 'Failed to upload receipt',
        severity: 'error'
      });
    }
  };
  useEffect(() => {
    PaymentHoneypotMonitor.resetSession();
    fetchPayments();
    fetchPaymentHistory();

    return () => {
      PaymentHoneypotMonitor.resetSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPaymentHistory([]);
        return;
      }
      
      // Decode JWT safely to get student ID
      const tokenPayload = decodeJwtPayload(token);
      const studentId = tokenPayload?.id;
      
      if (!studentId) {
        setPaymentHistory([]);
        return;
      }
      
      const response = await axios.get(`/api/payment-history?studentId=${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    }
  };

  const fetchPayments = async (forceRefresh = false) => {
    try {
      // Check cache first (unless forcing refresh), but keep existing logic
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('paymentData');
        const cacheTimestamp = localStorage.getItem('paymentDataTimestamp');
        const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : null;
        
        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge && cacheAge < 300000) {
        const parsedData = JSON.parse(cachedData);
        setPayments([parsedData]);
        setTotalBalance(parsedData.remaining_balance || 0);
        setLoading(false);
          
          // Always do background refresh to check for updates (balance changes, status updates, etc.)
          fetchPayments(true).catch(err => {
            console.error("Background refresh error:", err);
            // Keep showing cached data if background refresh fails
          });
          return;
        }
      }

      // Only show loading if not forcing refresh (we already have data in background refresh)
      if (!forceRefresh) {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get('/api/student-payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && response.data.length > 0) {
        const paymentData = response.data[0];
        const formattedPayment = {
          ...paymentData,
          enrollment_id: paymentData.enrollment_id,
          remaining_balance: paymentData.remaining_balance || 0 // Ensure remaining_balance exists
        };
        
        // Cache the formatted payment data
        localStorage.setItem('paymentData', JSON.stringify(formattedPayment));
        localStorage.setItem('paymentDataTimestamp', Date.now().toString());
        
        setPayments([formattedPayment]);
        setTotalBalance(formattedPayment.remaining_balance || 0);
      }
      
      // Only update loading if not forcing refresh
      if (!forceRefresh) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to fetch payment information.');
      setLoading(false);
    }
  };

  const handlePrintReceipt = (transaction) => {
      const safeTransaction = {
        reference_number: escapeHtml(transaction.reference_number),
        payment_date: transaction.payment_date,
        amount_paid: Number.parseFloat(transaction.amount_paid || 0),
        payment_method: escapeHtml(transaction.payment_method),
        remarks: escapeHtml(transaction.remarks),
        payment_status: escapeHtml(transaction.payment_status),
        processed_by_name: escapeHtml(transaction.processed_by_name)
      };

      const receiptContent = `
        <div style="font-family: Arial; padding: 20px; max-width: 500px; margin: 0 auto; border: 2px solid #ccc; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${officialolshcologo}" alt="OLSHCO Logo" style="width: 100px; height: 100px; margin-bottom: 10px; object-fit: contain;"/>
            <h2 style="color: #003366; margin: 5px 0;">Our Lady of the Sacred Heart College of Guimba Inc.</h2>
          <p style="color: #666; margin: 5px 0;">Guimba, Nueva Ecija</p>
          <h3 style="color: #003366; margin: 15px 0;">Official Receipt</h3>
        </div>
        <div style="border-top: 2px solid #003366; border-bottom: 2px solid #003366; padding: 15px 0; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;"><strong>Receipt No:</strong></td>
              <td>${safeTransaction.reference_number}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Date:</strong></td>
              <td>${new Date(safeTransaction.payment_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Amount Paid:</strong></td>
              <td>₱${safeTransaction.amount_paid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
              <td>${safeTransaction.payment_method}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Description:</strong></td>
              <td>${safeTransaction.remarks}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Status:</strong></td>
              <td>${safeTransaction.payment_status}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Processed By:</strong></td>
              <td>${safeTransaction.processed_by_name}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 5px 0;">This is your official receipt. Please keep this for your records.</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">Thank you for your payment!</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
        </head>
        <body style="margin: 0; padding: 20px;">
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="right-content w-100" data-testid="student-payment">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">
          Payment Information
        </h3>
      </div>

      <div className="card shadow border-0 p-3 mt-3">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <CircularProgress style={{ color: '#c70202' }} />
          </div>
        ) : error ? (
          <div className="alert alert-info" role="alert">
            {error}
          </div>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    color: '#666',
                    '&.Mui-selected': {
                      color: '#c70202',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#c70202',
                  },
                }}
              >
                <Tab label="Current Balance" />
                <Tab label="Payment History" />
              </Tabs>
            </Box>

            {activeTab === 0 ? (
              <>
                {/* Existing Payment Summary and Current Balance Table */}
                <div className="mb-3">
                  <h4 className="hd">Payment Summary</h4>
                  <Paper elevation={0} className="p-3 bg-light" data-testid="payment-summary">
                    <div className="row">
                      <div className="col-md-6">
                        <h5>Remaining Balance: ₱{totalBalance.toFixed(2)}</h5>
                      </div>
                      <div className="col-md-6">
                        <h5>Breakdown:</h5>
                        {payments[0]?.breakdown && (
                          <div className="ms-3">
                            {payments[0]?.student_type === 'transferee' ? (
                              <>
                                <p><strong>Tuition Fee:</strong> ₱{parseFloat(payments[0].breakdown.tuition).toFixed(2)}</p>
                                <p className="text-muted small">
                                  ({payments[0].breakdown.units} units × ₱{payments[0].breakdown.unit_rate} = ₱{parseFloat(payments[0].breakdown.tuition).toFixed(2)})
                                </p>
                                <p><strong>Miscellaneous:</strong> ₱{parseFloat(payments[0].breakdown.misc).toFixed(2)}</p>
                                <p><strong>Laboratory:</strong> ₱{parseFloat(payments[0].breakdown.lab).toFixed(2)}</p>
                                <p><strong>Other Fees:</strong> ₱{parseFloat(payments[0].breakdown.other).toFixed(2)}</p>
                                <hr className="my-2" />
                                <p className="text-info small">
                                  <strong>Assigned Courses:</strong> {payments[0].breakdown.assigned_courses} courses
                                </p>
                              </>
                            ) : (
                              <>
                                <p>Tuition Fee: ₱{parseFloat(payments[0].breakdown.tuition).toFixed(2)}</p>
                                <p>Miscellaneous: ₱{parseFloat(payments[0].breakdown.misc).toFixed(2)}</p>
                                <p>Laboratory: ₱{parseFloat(payments[0].breakdown.lab).toFixed(2)}</p>
                                <p>Other Fees: ₱{parseFloat(payments[0].breakdown.other).toFixed(2)}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Paper>
                </div>

                <div className="mt-3">
                  <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <TableContainer>
                      <Table aria-label="payment table">
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Description</TableCell>
                            <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Due Date</TableCell>
                            <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Amount</TableCell>
                            <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Status</TableCell>
                            <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow 
                              key={payment.id}
                              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              hover
                            >
                              <TableCell>{payment.description}</TableCell>
                              <TableCell align="center">{payment.dueDate}</TableCell>
                              <TableCell align="center">₱{payment.amount.toFixed(2)}</TableCell>
                              <TableCell align="center">
                                <span className={`badge ${payment.status.toLowerCase() === 'fully paid' ? 'bg-success' : payment.status.toLowerCase() === 'partial' ? 'bg-warning' : 'bg-danger'}`}>
                                  {payment.status}
                                </span>
                              </TableCell>
                              <TableCell align="center">
                                {payment.status?.toLowerCase() === 'fully paid' ? (
                                  <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                                    No upload needed
                                  </Typography>
                                ) : (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      setOpenVerifyDialog(true);
                                    }}
                                    sx={{
                                      minWidth: '130px !important',
                                      height: '30px',
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      backgroundColor: '#c70202',
                                      '&:hover': {
                                        backgroundColor: '#a00000'
                                      }
                                    }}
                                  >
                                    Upload Check Receipt
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </div>
              </>
            ) : (
              <div>
                <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                  <TableContainer>
                    <Table aria-label="payment history table">
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Receipt No.</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Date</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Description</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Amount Paid</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Payment Method</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Status</TableCell>
                          <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentHistory && paymentHistory.length > 0 ? (
                          paymentHistory.map((transaction) => (
                            <TableRow 
                              key={transaction.transaction_id}
                              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              hover
                            >
                              <TableCell align="center">{transaction.reference_number}</TableCell>
                              <TableCell align="center">{new Date(transaction.payment_date).toLocaleDateString()}</TableCell>
                              <TableCell>{transaction.remarks}</TableCell>
                              <TableCell align="center">₱{parseFloat(transaction.amount_paid).toFixed(2)}</TableCell>
                              <TableCell align="center">{transaction.payment_method}</TableCell>
                              <TableCell align="center">
                                <span className={`badge ${transaction.payment_status.toLowerCase() === 'fully paid' ? 'bg-success' : transaction.payment_status.toLowerCase() === 'partial' ? 'bg-warning' : 'bg-danger'}`}>
                                  {transaction.payment_status}
                                </span>
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handlePrintReceipt(transaction)}
                                  startIcon={<FaPrint />}
                                  sx={{
                                    borderColor: '#c70202',
                                    color: '#c70202',
                                    '&:hover': {
                                      borderColor: '#a00000',
                                      backgroundColor: '#c70202',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  Print
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan="7" align="center">
                              No payment history found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={openVerifyDialog} onClose={() => {
        setOpenVerifyDialog(false);
        setError(null); // Clear error when closing dialog
      }}
      PaperProps={{
        sx: {
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden'
        }
      }}>
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2b2b2b' }}>
            Upload Check Receipt
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important', pb: 1 }}>
          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              {error}
            </div>
          )}
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="receipt-image-upload"
            type="file"
            onChange={(e) => {
              setReceiptImage(e.target.files[0]);
              setError(null); // Clear error when new file selected
            }}
          />
          <label htmlFor="receipt-image-upload">
            <Button
              component="span"
              variant="outlined"
              startIcon={<PhotoCamera />}
              sx={{
                mt: 1.5,
                mb: 1,
                py: 1.25,
                fontWeight: 600,
                borderRadius: '10px',
                borderColor: '#c70202',
                color: '#c70202',
                '&:hover': {
                  borderColor: '#a00000',
                  backgroundColor: '#fff5f5'
                }
              }}
              fullWidth
            >
              Upload Check Receipt Image
            </Button>
          </label>
          <Typography variant="caption" sx={{ color: '#666' }}>
            If you paid in Cash at the counter, you don't need to upload.
            Upload is required only for Check payments.
          </Typography>
          {receiptImage && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.25,
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                backgroundColor: '#fafafa'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                Selected file
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {receiptImage.name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            variant="text"
            sx={{
              color: '#6c757d',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#f4f6f8' }
            }}
            onClick={() => {
            setOpenVerifyDialog(false);
            setReceiptImage(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleReceiptSubmit}
            disabled={!receiptImage}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              fontWeight: 700,
              bgcolor: '#c70202',
              color: 'white',
              '&:hover': { bgcolor: '#a00000' },
              '&.Mui-disabled': {
                bgcolor: '#f0b3b3',
                color: '#fff'
              }
            }}
          >
            Submit for Verification
          </Button>
        </DialogActions>
      </Dialog>

      {/* Honeypot: Fake Receipt Dialog - Looks identical to real one */}
      <Dialog open={showFakeReceiptDialog} onClose={handleFakeReceiptClose}
      PaperProps={{
        sx: {
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden'
        }
      }}>
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2b2b2b' }}>
            Upload Check Receipt
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important', pb: 1 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="fake-receipt-image-upload"
            type="file"
            onChange={handleFakeReceiptFileChange}
          />
          <label htmlFor="fake-receipt-image-upload">
            <Button
              component="span"
              variant="outlined"
              startIcon={<PhotoCamera />}
              sx={{
                mt: 1.5,
                mb: 1,
                py: 1.25,
                fontWeight: 600,
                borderRadius: '10px',
                borderColor: '#c70202',
                color: '#c70202',
                '&:hover': {
                  borderColor: '#a00000',
                  backgroundColor: '#fff5f5'
                }
              }}
              fullWidth
            >
              Upload Check Receipt Image
            </Button>
          </label>
          <Typography variant="caption" sx={{ color: '#666' }}>
            If you paid in Cash at the counter, you don't need to upload.
            Upload is required only for Check payments.
          </Typography>
          {fakeReceiptImage && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.25,
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                backgroundColor: '#fafafa'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                Selected file
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {fakeReceiptImage.name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            variant="text"
            sx={{
              color: '#6c757d',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#f4f6f8' }
            }}
            onClick={handleFakeReceiptClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFakeReceiptSubmit}
            disabled={!fakeReceiptImage}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              fontWeight: 700,
              bgcolor: '#c70202',
              color: 'white',
              '&:hover': { bgcolor: '#a00000' },
              '&.Mui-disabled': {
                bgcolor: '#f0b3b3',
                color: '#fff'
              }
            }}
          >
            Submit for Verification
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default StudentPayment;