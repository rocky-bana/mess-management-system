import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, CircularProgress, Alert, Rating } from '@mui/material';

interface Feedback {
  feedback_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function FeedbackWall() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = () => {
    setLoading(true);
    fetch('http://localhost:8000/feedback/')
      .then(r => {
        if (!r.ok) throw new Error("Failed to load feedback");
        return r.json();
      })
      .then(data => {
        setFeedbacks(data);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    fetch('http://localhost:8000/feedback/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: rating || 5, comment: comment.trim() || null })
    })
    .then(r => {
      if (!r.ok) throw new Error("Failed to submit feedback");
      return r.json();
    })
    .then(() => {
      setComment("");
      setRating(5);
      fetchFeedback();
    })
    .catch(e => alert(e.message))
    .finally(() => setSubmitting(false));
  };

  if (loading && feedbacks.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
        <Typography variant="h4" fontWeight="bold">Feedback Wall</Typography>
        <Typography color="text.secondary">Let us know how we can improve the mess experience.</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ position: 'sticky', top: 24 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Leave Feedback</Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography component="legend" color="text.secondary" gutterBottom>Rating</Typography>
                  <Rating
                    value={rating}
                    onChange={(event, newValue) => {
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

        <Grid item xs={12} md={8}>
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
