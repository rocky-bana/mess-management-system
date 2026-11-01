import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import type { MenuItem } from './MenuItemsList';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Button,
  Grid, Select, MenuItem as MUIMenuItem, FormControl, InputLabel, Paper,
  IconButton, Chip, Divider, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';

interface CalendarMeal {
  menu_id: number;
  meal_type: string;
  menu_item: MenuItem;
}

interface CalendarDay {
  date: string;
  day_of_week: string;
  meals: CalendarMeal[];
}

interface Toast {
  severity: 'success' | 'error';
  message: string;
}

export function CalendarView() {
  const { dbUser, currentUser } = useAuth();
  const canManage = dbUser?.role === 'contributer' || dbUser?.role === 'admin';

  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controlled UI State
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // Feedback + delete confirmation (local to this view)
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // State for Add Meal form
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDay, setAddDay] = useState('Monday');
  const [addMealType, setAddMealType] = useState('Breakfast');
  const [addMenuItemIds, setAddMenuItemIds] = useState<string[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  const fetchCalendar = () => {
    setLoading(true);
    authFetch('/calendar/')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        setDays(data);
        setError(null);
        setLoading(false);
      })
      .catch(e => {
        console.error("Fetching error:", e);
        setError("Failed to load calendar. Is the backend running?");
        setLoading(false);
      });
  };

  const fetchMenuItems = () => {
    authFetch('/menu-items/')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(data => {
        setMenuItems(data);
        if (data.length > 0) setAddMenuItemIds([data[0].item_id.toString()]);
      })
      .catch(e => console.error("Error fetching menu items:", e));
  };

  useEffect(() => {
    fetchCalendar();
    fetchMenuItems();
  }, []);

  const handleConfirmDelete = async () => {
    const menuId = pendingDeleteId;
    setPendingDeleteId(null);
    if (menuId === null) return;
    if (!currentUser) {
      setToast({ severity: 'error', message: 'You must be logged in to remove a meal.' });
      return;
    }

    try {
      const response = await authFetch(`/daily-menu/${menuId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setToast({ severity: 'success', message: 'Meal removed from schedule' });
        fetchCalendar(); // Refresh calendar after deletion
      } else {
        const err = await response.json().catch(() => ({ detail: "Failed to delete meal" }));
        setToast({ severity: 'error', message: `Failed to delete meal: ${err.detail || response.statusText}` });
      }
    } catch (e) {
      console.error(e);
      setToast({ severity: 'error', message: 'Error deleting meal from schedule' });
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addMenuItemIds.length === 0) {
      setToast({ severity: 'error', message: 'Please select at least one menu item' });
      return;
    }
    if (!currentUser) {
      setToast({ severity: 'error', message: 'You must be logged in to schedule meals.' });
      return;
    }

    setAddLoading(true);
    const results = await Promise.allSettled(
      addMenuItemIds.map(async (itemId) => {
        const response = await authFetch('/daily-menu/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            day: addDay,
            meal_type: addMealType,
            item_id: parseInt(itemId)
          })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(typeof err.detail === 'string' ? err.detail : response.statusText || 'Unknown error');
        }
      })
    );

    // Keep only the items that failed, so a retry never re-adds the ones that succeeded
    const failed = results.flatMap((r, i) =>
      r.status === 'rejected'
        ? [{ id: addMenuItemIds[i], message: r.reason instanceof Error ? r.reason.message : String(r.reason) }]
        : []
    );
    const succeededCount = results.length - failed.length;

    if (failed.length === 0) {
      setShowAddForm(false);
      setToast({ severity: 'success', message: 'Meal(s) added' });
    } else {
      setAddMenuItemIds(failed.map(f => f.id));
      setToast({
        severity: 'error',
        message: `${failed.length} of ${results.length} meal(s) failed to add: ${failed[0].message}`,
      });
    }

    if (succeededCount > 0) fetchCalendar();
    setAddLoading(false);
  };

  if (loading && days.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  // Find the selected day's data from our backend array
  const formattedSelectedDate = selectedDate.format('YYYY-MM-DD');
  const selectedDayData = days.find(d => d.date.startsWith(formattedSelectedDate));

  const displayDayName = selectedDate.format('dddd');
  const displayFormattedDate = selectedDate.format('MMM D, YYYY');
  const isToday = selectedDate.isSame(dayjs(), 'day');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Menu Calendar</Typography>
          <Typography color="text.secondary">Select a date to view the scheduled meals</Typography>
        </Box>
        {canManage && (
          <Button
            variant={showAddForm ? "outlined" : "contained"}
            color="primary"
            startIcon={showAddForm ? undefined : <AddIcon />}
            onClick={() => setShowAddForm(!showAddForm)}
            size="large"
            sx={{ fontWeight: 'bold' }}
          >
            {showAddForm ? 'Cancel' : 'Schedule New Meal'}
          </Button>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={fetchCalendar}>Retry</Button>}
        >
          {error}
        </Alert>
      )}

      {showAddForm && (
        <Paper elevation={3} sx={{ p: 4, mb: 5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Add Meal to Global Schedule</Typography>
          <Divider sx={{ mb: 3 }} />
          <Box component="form" onSubmit={handleAddMeal} sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150, flexGrow: 1 }} variant="filled">
              <InputLabel>Day of Week</InputLabel>
              <Select value={addDay} label="Day of Week" onChange={e => setAddDay(e.target.value)}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <MUIMenuItem key={d} value={d}>{d}</MUIMenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150, flexGrow: 1 }} variant="filled">
              <InputLabel>Meal Type</InputLabel>
              <Select value={addMealType} label="Meal Type" onChange={e => setAddMealType(e.target.value)}>
                {['Breakfast', 'Lunch', 'Dinner'].map(m => (
                  <MUIMenuItem key={m} value={m}>{m}</MUIMenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 250, flexGrow: 2 }} variant="filled">
              <InputLabel>Menu Items</InputLabel>
              <Select
                multiple
                value={addMenuItemIds}
                label="Menu Items"
                onChange={e => setAddMenuItemIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const item = menuItems.find(i => i.item_id.toString() === value);
                      return <Chip key={value} label={item?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {menuItems.map(item => (
                  <MUIMenuItem key={item.item_id} value={item.item_id.toString()}>{item.name}</MUIMenuItem>
                ))}
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" color="success" disabled={addLoading} sx={{ height: 56, px: 4, fontWeight: 'bold' }}>
              {addLoading ? 'Saving...' : 'Add to Schedule'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Repeats every {addDay} in the schedule
          </Typography>
        </Paper>
      )}

      <Grid container spacing={4}>
         {/* LEFT PANE: Calendar Date Picker */}
         <Grid size={{ xs: 12, md: 5, lg: 4 }}>
           <Button variant="outlined" size="small" onClick={() => setSelectedDate(dayjs())} sx={{ mb: 1 }}>
             Today
           </Button>
           <Card elevation={2} sx={{ position: { xs: 'static', md: 'sticky' }, top: 88 }}>
             <LocalizationProvider dateAdapter={AdapterDayjs}>
               <DateCalendar
                 value={selectedDate}
                 onChange={(newDate) => setSelectedDate(newDate || dayjs())}
                 sx={{ width: '100%', '.MuiPickersCalendarHeader-root': { px: 2 } }}
               />
             </LocalizationProvider>
           </Card>
         </Grid>

         {/* RIGHT PANE: Selected Date Meal Details */}
         <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
              <Box sx={{
                bgcolor: (displayDayName === 'Saturday' || displayDayName === 'Sunday') ? '#1e293b' : '#1976d2',
                color: 'white',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon />
                  <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: 1 }}>{displayDayName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>{displayFormattedDate}</Typography>
                  {isToday && (
                    <Chip label="Today" size="small" sx={{ bgcolor: 'white', color: '#1976d2', fontWeight: 'bold' }} />
                  )}
                </Box>
              </Box>

              <CardContent sx={{ p: 0 }}>
                {!selectedDayData ? (
                   <Box sx={{ p: 6, textAlign: 'center' }}>
                     <Typography color="text.secondary" variant="subtitle1" fontStyle="italic">
                       No menu scheduled for this date.
                     </Typography>
                   </Box>
                ) : (
                   <Grid container>
                     {['Breakfast', 'Lunch', 'Dinner'].map((mealType, index) => {
                        const mealsForType = selectedDayData.meals.filter(m => m.meal_type === mealType);

                        return (
                           <Grid size={{ xs: 12 }} key={mealType} sx={{ borderBottom: index < 2 ? '1px solid #e0e0e0' : 'none', p: 3 }}>
                             <Typography variant="h6" fontWeight="bold" color="text.secondary" gutterBottom sx={{ borderBottom: '2px solid', borderColor: mealType === 'Breakfast' ? '#f59e0b' : mealType === 'Lunch' ? '#10b981' : '#3b82f6', display: 'inline-block', pb: 0.5, mb: 3 }}>
                               {mealType}
                             </Typography>

                             {mealsForType.length > 0 ? (
                               <Grid container spacing={2}>
                                 {mealsForType.map((meal) => (
                                   <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }} key={meal.menu_id}>
                                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, position: 'relative', '&:hover .delete-btn': { opacity: 1 }, transition: '0.2s', '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                      <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" fontWeight="bold" sx={{ pr: 3, color: '#1e293b' }}>{meal.menu_item.name}</Typography>

                                        {meal.menu_item.description && (
                                          <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 1, mb: 1 }}>
                                            {meal.menu_item.description}
                                          </Typography>
                                        )}
                                      </Box>

                                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', flexWrap: 'wrap', pt: 2 }}>
                                        <Chip
                                          label={meal.menu_item.is_vegetarian ? 'Veg' : 'Non-Veg'}
                                          color={meal.menu_item.is_vegetarian ? 'success' : 'error'}
                                          size="small"
                                          sx={{ fontWeight: 'bold' }}
                                        />
                                        {meal.menu_item.calories != null && (
                                          <Chip
                                            label={`${meal.menu_item.calories} cal`}
                                            size="small"
                                            variant="outlined"
                                          />
                                        )}
                                      </Box>

                                      {canManage && (
                                        <IconButton
                                          className="delete-btn"
                                          aria-label={`Remove ${meal.menu_item.name}`}
                                          size="small"
                                          color="error"
                                          sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'rgba(254, 226, 226, 0.5)', '&:hover': { bgcolor: '#fecaca' }, '&:focus-visible': { opacity: 1 }, '@media (hover: none)': { opacity: 1 } }}
                                          onClick={() => setPendingDeleteId(meal.menu_id)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Paper>
                                  </Grid>
                                ))}
                              </Grid>
                            ) : (
                              <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                                 <Typography variant="body1" color="text.secondary" fontStyle="italic">No item scheduled</Typography>
                              </Box>
                            )}
                          </Grid>
                        );
                     })}
                   </Grid>
                )}
              </CardContent>
            </Card>
         </Grid>
      </Grid>

      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove meal?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to remove this meal from the schedule?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>Remove</Button>
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
}
