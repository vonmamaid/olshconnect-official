import React, { useState, useEffect, useContext } from 'react';
import {
  Button,
  TextField,
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Paper,
  MenuItem,
} from '@mui/material';
import { MdAnnouncement, MdEdit, MdDelete, MdAdd } from 'react-icons/md';
import { MyContext } from '../../App';

const AnnouncementsPanel = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    announcement_date: new Date().toISOString().slice(0, 10),
    link: '',
    media_url: '',
    media_type: '',
  });

  const context = useContext(MyContext);

  useEffect(() => {
    if (context?.setIsHideComponents) context.setIsHideComponents(false);
    fetchAnnouncements();
  }, [context]);

  const getToken = () => localStorage.getItem('token');

  const detectMediaTypeFromUrl = (url = '') => {
    const value = (url || '').toLowerCase().split('?')[0].split('#')[0];
    if (!value) return '';
    if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(value)) return 'image';
    if (/\.(mp4|webm|ogg|mov|m4v)$/.test(value)) return 'video';
    if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar)$/.test(value)) return 'file';
    return '';
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed to load announcements');
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: err.message || 'Failed to load announcements', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      announcement_date: new Date().toISOString().slice(0, 10),
      link: '',
      media_url: '',
      media_type: '',
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.announcement_id);
    setForm({
      title: row.title || '',
      description: row.description || '',
      announcement_date: (row.announcement_date || '').slice(0, 10),
      link: row.link || '',
      media_url: row.media_url || '',
      media_type: row.media_type || '',
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setSnackbar({ open: true, message: 'Title and description are required', severity: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const url = '/api/announcements';
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        announcement_date: form.announcement_date || new Date().toISOString().slice(0, 10),
        link: form.link.trim() || null,
        media_url: form.media_url.trim() || null,
        media_type: form.media_type || (detectMediaTypeFromUrl(form.media_url) || null),
      };
      const options = {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingId ? { ...body, announcement_id: editingId } : body),
      };
      const res = await fetch(editingId ? `${url}?id=${editingId}` : url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
      setSnackbar({ open: true, message: editingId ? 'Announcement updated.' : 'Announcement created.', severity: 'success' });
      handleCloseModal();
      fetchAnnouncements();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (id) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/announcements?id=${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Delete failed');
      setSnackbar({ open: true, message: 'Announcement deleted.', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteId(null);
      fetchAnnouncements();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const s = typeof d === 'string' ? d : d?.toISOString?.();
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return s.slice(0, 10);
    }
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 p-3 mt-1">
        <h3 className="hd mt-2 pb-0">Announcements</h3>
      </div>

      <div className="card shadow border-0 p-3 mt-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="hd mb-0">Homepage Announcements</h3>
          <Button
            variant="contained"
            startIcon={<MdAdd />}
            onClick={openAdd}
            className="enrollbut"
            sx={{
              bgcolor: '#c70202',
              '&:hover': { bgcolor: '#a00000' },
            }}
          >
            Add Announcement
          </Button>
        </div>

        <Paper elevation={3} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress sx={{ color: '#c70202' }} />
            </Box>
          ) : announcements.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No announcements yet. Click &quot;Add Announcement&quot; to create one.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Title</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Date</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }}>Description</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#c70202' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {announcements.map((row) => (
                    <TableRow key={row.announcement_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{formatDate(row.announcement_date)}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>{row.description?.slice(0, 80)}{(row.description?.length || 0) > 80 ? '…' : ''}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(row)} title="Edit" sx={{ color: '#c70202', '&:hover': { backgroundColor: 'rgba(199, 2, 2, 0.1)' } }}>
                          <MdEdit />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(row.announcement_id)} title="Delete" sx={{ color: '#dc3545', '&:hover': { backgroundColor: 'rgba(220, 53, 69, 0.1)' } }}>
                          <MdDelete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </div>

      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 480 },
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </Typography>
          <form onSubmit={handleSave}>
            <TextField
              fullWidth
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              multiline
              rows={3}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={form.announcement_date}
              onChange={(e) => setForm((f) => ({ ...f, announcement_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Link (optional)"
              placeholder="https://..."
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Media URL (optional)"
              placeholder="https://.../image.jpg or video.mp4"
              value={form.media_url}
              onChange={(e) => {
                const nextUrl = e.target.value;
                setForm((f) => ({
                  ...f,
                  media_url: nextUrl,
                  media_type: f.media_type || detectMediaTypeFromUrl(nextUrl),
                }));
              }}
              margin="normal"
            />
            <TextField
              select
              fullWidth
              label="Media Type (optional)"
              value={form.media_type}
              onChange={(e) => setForm((f) => ({ ...f, media_type: e.target.value }))}
              margin="normal"
              helperText="If left blank, the system tries to detect it from Media URL."
            >
              <MenuItem value="">Auto detect</MenuItem>
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="video">Video</MenuItem>
              <MenuItem value="file">File/Document</MenuItem>
            </TextField>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={24} /> : (editingId ? 'Update' : 'Create')}
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete announcement?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AnnouncementsPanel;
