import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileDialog: React.FC<ProfileDialogProps> = ({ open, onClose }) => {
  const { currentUser, dbUser, fetchDBUser } = useAuth();
  const [name, setName] = useState(dbUser?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the name whenever the dialog opens or the stored user changes
  useEffect(() => {
    if (!open) return;
    setName(dbUser?.name || '');
  }, [open, dbUser]);

  // Clear messages each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(false);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const trimmedName = name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await authFetch('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: trimmedName })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await fetchDBUser();
      setSuccess(true);
      closeTimer.current = setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Update Profile</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Profile updated successfully!</Alert>}
            
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={loading}
            />
            
            <TextField
              label="Email"
              value={dbUser?.email || ''}
              fullWidth
              disabled
              helperText="Email cannot be changed here."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || trimmedName === dbUser?.name}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
