import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, CircularProgress, Alert, Rating } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../utils/api';

interface Feedback {
  feedback_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function FeedbackWall() {
  const { currentUser, dbUser } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/feedback/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to load feedback");
      const data = await response.json();
      setFeedbacks(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/feedback/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: rating || 5, comment: comment.trim() || null })
      });
      if (!response.ok) throw new Error("Failed to submit feedback");
      setComment("");
      setRating(5);
      fetchFeedback();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && feedbacks.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
        <Typography variant="h4" fontWeight="bold">Feedback Wall</Typography>
        <Typography color="text.secondary">Let us know how we can improve the mess experience.</Typography>
      </Box>

      <Grid container spacing={4}>
        {dbUser?.role === 'reader' && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={2} sx={{ position: 'sticky', top: 24 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Leave Feedback</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography component="legend" color="text.secondary" gutterBottom>Rating</Typography>
                    <Rating
                      value={rating}
                      onChange={(_, newValue) => {
                        setRating(newValue);
                      }}
                      size="large"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Comment (optional)"
                    variant="outlined"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {submitting ? 'Submitting...' : 'Post Feedback'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, md: dbUser?.role === 'reader' ? 8 : 12 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {feedbacks.length === 0 && !loading && !error && (
            <Box sx={{ textAlign: 'center', p: 6, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed grey' }}>
              <Typography color="text.secondary" fontStyle="italic">No feedback has been posted yet. Be the first!</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feedbacks.map((item) => (
              <Card key={item.feedback_id} elevation={1} sx={{ transition: '0.2s', '&:hover': { boxShadow: 3 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Rating value={item.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  {item.comment ? (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>{item.comment}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">User left a rating without a comment.</Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
