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
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import type { DBUser, Role } from '../types/user';

export const ManageUsers: React.FC = () => {
  const { currentUser, dbUser } = useAuth();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:8000/users/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users. Ensure you have admin permissions.');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
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
      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:8000/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      // Update local state
      setUsers(users.map(u => (u.user_id === userId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!currentUser || !window.confirm('Are you sure you want to delete this user? This will also remove them from Firebase Authentication.')) return;
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      // Update local state
      setUsers(users.filter(u => u.user_id !== userId));
    } catch (err: any) {
      alert(err.message);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Manage Users
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Current Role</TableCell>
              <TableCell>Joined At</TableCell>
              <TableCell>Change Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.user_id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {user.user_id}
                </TableCell>
                <TableCell>{user.name || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    size="small"
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value as Role)}
                    disabled={user.user_id === dbUser.user_id} // Prevent admin from changing their own role to avoid lockout
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="contributer">Contributer</MenuItem>
                    <MenuItem value="reader">Reader</MenuItem>
                   </Select>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete User">
                    <span>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteUser(user.user_id)}
                        disabled={user.user_id === dbUser.user_id}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};
