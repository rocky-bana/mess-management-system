import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import type { DBUser, Role } from '../types/user';

const SELF_ACTION_TIP = "You can't change or delete your own account";

interface Toast {
  severity: 'success' | 'error';
  message: string;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');

export const ManageUsers: React.FC = () => {
  const { currentUser, dbUser } = useAuth();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DBUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    if (!currentUser) return;
    try {
      const response = await authFetch('/users/');
      if (!response.ok) {
        throw new Error('Failed to fetch users. Ensure you have admin permissions.');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleRoleChange = async (userId: number, newRole: Role) => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      // Update local state
      setUsers(prev => prev.map(u => (u.user_id === userId ? { ...u, role: newRole } : u)));
      setToast({ severity: 'success', message: 'Role updated' });
    } catch (err) {
      setToast({ severity: 'error', message: errorMessage(err) });
    }
  };

  const handleConfirmDelete = async () => {
    const target = pendingDelete;
    if (!currentUser || !target) return;
    setDeleting(true);
    try {
      const response = await authFetch(`/users/${target.user_id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      // Update local state
      setUsers(prev => prev.filter(u => u.user_id !== target.user_id));
      setToast({ severity: 'success', message: 'User deleted' });
    } catch (err) {
      setToast({ severity: 'error', message: errorMessage(err) });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (dbUser?.role !== 'admin') {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Access Denied: You must be an admin to view this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
        <Typography variant="h4" fontWeight="bold">Manage Users</Typography>
        <Typography color="text.secondary">Change roles or remove users</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Joined At</TableCell>
              <TableCell>Change Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.user_id === dbUser.user_id;
              return (
                <TableRow
                  key={user.user_id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">{user.name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Tooltip title={isSelf ? SELF_ACTION_TIP : ''}>
                      <span>
                        <Select
                          value={user.role}
                          size="small"
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value as Role)}
                          disabled={isSelf} // Prevent admin from changing their own role to avoid lockout
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="contributer">Contributor</MenuItem>
                          <MenuItem value="reader">Reader</MenuItem>
                        </Select>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={isSelf ? SELF_ACTION_TIP : 'Delete User'}>
                      <span>
                        <IconButton
                          color="error"
                          aria-label={`Delete ${user.name || user.email}`}
                          onClick={() => setPendingDelete(user)}
                          disabled={isSelf}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={pendingDelete !== null} onClose={() => !deleting && setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {pendingDelete?.name || 'this user'} ({pendingDelete?.email})?
            This will also remove them from Firebase Authentication.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
