import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, CircularProgress, Alert, Rating, Chip, FormControl, FormHelperText, InputLabel, LinearProgress, Select, MenuItem, Snackbar } from '@mui/material';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

interface Feedback {
  feedback_id: number;
  user_id: number | null;
  user_name: string | null;
  rating: number;
  comment: string | null;
  meal_date: string;
  meal_type: MealType | null;
  created_at: string;
}

const LOOKBACK_DAYS = 13;

const FORM_MEAL_OPTIONS: { value: '' | MealType; label: string }[] = [
  { value: '', label: 'Whole day' },
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Dinner', label: 'Dinner' },
];

// Order in which a free slot is auto-selected when the current one is taken
const AUTO_MEAL_ORDER: ('' | MealType)[] = ['Breakfast', 'Lunch', 'Dinner', ''];

const FILTER_MEAL_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'whole_day', label: 'Whole day' },
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Dinner', label: 'Dinner' },
];

// Pick the meal most likely to be given right now
const defaultMealForNow = (): MealType => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
};

// FastAPI sends a string `detail` for HTTP errors and a list of field errors for 422s
const getErrorMessage = (detail: unknown, fallback: string) => {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, '');
  return fallback;
};

export function FeedbackWall() {
  const { currentUser, dbUser } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterMeal, setFilterMeal] = useState("");

  const [mealDate, setMealDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [mealType, setMealType] = useState<'' | MealType>(defaultMealForNow());
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const fetchFeedback = async () => {
    if (!currentUser) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set('meal_date', filterDate);
    if (filterMeal === 'whole_day') params.set('whole_day', 'true');
    else if (filterMeal) params.set('meal_type', filterMeal);
    try {
      const response = await authFetch(`/feedback/?${params.toString()}`);
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

  const fetchMyFeedback = async () => {
    if (!currentUser) return;
    try {
      const response = await authFetch('/feedback/?mine=true');
      if (!response.ok) throw new Error("Failed to load your feedback");
      setMyFeedbacks(await response.json());
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [currentUser, filterDate, filterMeal]);

  useEffect(() => {
    fetchMyFeedback();
  }, [currentUser]);

  // A meal slot is taken once the user has feedback for that date and meal (or whole day)
  const isSlotTaken = (date: string, meal: '' | MealType) =>
    myFeedbacks.some(f => f.meal_date === date && (f.meal_type ?? '') === meal);

  const allSlotsTaken = AUTO_MEAL_ORDER.every(meal => isSlotTaken(mealDate, meal));

  // Move to the first free slot when the selected one is taken
  useEffect(() => {
    if (!isSlotTaken(mealDate, mealType)) return;
    const firstFree = AUTO_MEAL_ORDER.find(meal => !isSlotTaken(mealDate, meal));
    if (firstFree !== undefined) setMealType(firstFree);
  }, [mealDate, mealType, myFeedbacks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || rating === null) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await authFetch('/feedback/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment: comment.trim() || null, meal_date: mealDate, meal_type: mealType || null })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(getErrorMessage(err.detail, "Failed to submit feedback"));
      }
      setComment("");
      setRating(5);
      setPosted(true);
      fetchFeedback();
      fetchMyFeedback();
    } catch (e: any) {
      setSubmitError(e.message);
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
        {currentUser && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={2} sx={{ position: { xs: 'static', md: 'sticky' }, top: 88 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Leave Feedback</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                  {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}
                  <TextField
                    fullWidth
                    type="date"
                    label="Date"
                    value={mealDate}
                    onChange={(e) => setMealDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { min: dayjs().subtract(LOOKBACK_DAYS, 'day').format('YYYY-MM-DD'), max: dayjs().format('YYYY-MM-DD') },
                    }}
                    sx={{ mb: 3 }}
                  />
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel shrink>Meal</InputLabel>
                    <Select displayEmpty value={mealType} label="Meal" onChange={(e) => setMealType(e.target.value as '' | MealType)}>
                      {FORM_MEAL_OPTIONS.map((option) => {
                        const taken = isSlotTaken(mealDate, option.value);
                        return (
                          <MenuItem key={option.value} value={option.value} disabled={taken}>
                            {option.label}{taken ? ' (already given)' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    {(allSlotsTaken || isSlotTaken(mealDate, mealType)) && (
                      <FormHelperText>
                        {allSlotsTaken ? "You've already given feedback for every meal on this date" : 'Already given'}
                      </FormHelperText>
                    )}
                  </FormControl>
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
                    disabled={submitting || rating === null || isSlotTaken(mealDate, mealType)}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {submitting ? 'Submitting...' : 'Post Feedback'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, md: currentUser ? 8 : 12 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
            <TextField
              size="small"
              type="date"
              label="Date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel shrink>Meal</InputLabel>
              <Select displayEmpty value={filterMeal} label="Meal" onChange={(e) => setFilterMeal(e.target.value)}>
                {FILTER_MEAL_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {(filterDate || filterMeal) && (
              <Button size="small" onClick={() => { setFilterDate(""); setFilterMeal(""); }}>Clear</Button>
            )}
          </Box>

          {loading && feedbacks.length > 0 && <LinearProgress sx={{ mb: 2 }} />}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {feedbacks.length === 0 && !loading && !error && (
            <Box sx={{ textAlign: 'center', p: 6, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed grey' }}>
              <Typography color="text.secondary" fontStyle="italic">
                {filterDate || filterMeal ? 'No feedback matches these filters.' : 'No feedback has been posted yet. Be the first!'}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feedbacks.map((item) => (
              <Card key={item.feedback_id} elevation={1} sx={{ transition: '0.2s', '&:hover': { boxShadow: 3 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Rating value={item.rating} readOnly size="small" aria-label={`${item.rating} out of 5 stars`} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      color="primary"
                      label={`${dayjs(item.meal_date).format('ddd, D MMM')} · ${item.meal_type ?? 'Whole day'}`}
                    />
                    <Typography variant="body2" color="text.secondary">{item.user_name || 'Anonymous'}</Typography>
                    {item.user_id !== null && item.user_id === dbUser?.user_id && (
                      <Chip size="small" label="You" color="primary" />
                    )}
                  </Box>
                  {item.comment ? (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>{item.comment}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">No comment.</Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={posted}
        autoHideDuration={3000}
        onClose={() => setPosted(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setPosted(false)}>Feedback posted</Alert>
      </Snackbar>
    </Box>
  );
}
