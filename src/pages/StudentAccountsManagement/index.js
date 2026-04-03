import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Chip,
  Pagination,
  Box,
  Paper
} from '@mui/material';
import { MyContext } from '../../App';
import Searchbar from '../../components/Searchbar';

const StudentAccountsManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const context = useContext(MyContext);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(`/api/student-accounts-management?page=${page}&limit=${rowsPerPage}${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(data.pagination?.totalPages || 1);      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to fetch student accounts');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch student accounts: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, rowsPerPage]);

  useEffect(() => {
    context.setIsHideComponents(false);
    fetchStudents();
  }, [context, fetchStudents]);

  useEffect(() => {
    // Debounce search and reset to page 1 when search term changes
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchStudents();
      } else {
        setPage(1); // Reset to first page when searching
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatStudentName = (firstName, middleName, lastName, suffix) => {
    const middleInitial = middleName ? ` ${middleName.charAt(0)}.` : '';
    const suffixText = suffix ? ` ${suffix}` : '';
    return `${lastName}, ${firstName}${middleInitial}${suffixText}`;
  };


  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Student Accounts Management</h3>
      </div>

      <div className="card shadow border-0 p-3 mt-3">
        <h3 className="hd mb-3">Student Accounts</h3>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <Searchbar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, username, or email..."
          />
        </Box>

        {/* Student Accounts List */}
        <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden', mb: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Student ID</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Username</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Email</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Sex</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Contact Number</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Role</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="7" style={{ textAlign: "center", padding: "40px 0" }}>
                      <CircularProgress style={{ color: '#c70202' }} />
                    </TableCell>
                  </TableRow>
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>
                        {formatStudentName(
                          student.first_name,
                          student.middle_name,
                          student.last_name,
                          student.suffix
                        )}
                      </TableCell>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.email || 'N/A'}</TableCell>
                      <TableCell>{student.sex || 'N/A'}</TableCell>
                      <TableCell>{student.contact_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={student.role || 'student'} 
                          color="primary" 
                          size="small"
                          sx={{ bgcolor: '#c70202', color: 'white' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="7" style={{ textAlign: "center" }}>
                      {searchTerm ? 'No students found matching your search' : 'No student accounts found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  '&.Mui-selected': {
                    bgcolor: '#c70202',
                    '&:hover': {
                      bgcolor: '#a00000',
                    },
                  },
                },
              }}
            />
          </Box>
        )}
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
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

export default StudentAccountsManagement;


