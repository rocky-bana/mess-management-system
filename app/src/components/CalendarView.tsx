import { useState, useEffect } from 'react';
import type { MenuItem } from './MenuItemsList';
import { 
  Box, Typography, Card, CardContent, CircularProgress, Alert, Button, 
  Grid, Select, MenuItem as MUIMenuItem, FormControl, InputLabel, Paper,
  IconButton, Chip, Divider
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

export function CalendarView() {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controlled UI State
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // State for Add Meal form
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDay, setAddDay] = useState('Monday');
  const [addMealType, setAddMealType] = useState('Breakfast');
  const [addMenuItemIds, setAddMenuItemIds] = useState<string[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  const fetchCalendar = () => {
    setLoading(true);
    fetch('http://localhost:8000/calendar/')
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
    fetch('http://localhost:8000/menu-items/')
      .then(r => r.json())
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

  const handleDelete = (menuId: number) => {
    if (!confirm('Are you sure you want to remove this meal from the schedule?')) return;
    
    fetch(`http://localhost:8000/daily-menu/${menuId}`, {
      method: 'DELETE',
    })
    .then(response => {
      if (response.ok) {
        fetchCalendar(); // Refresh calendar after deletion
      } else {
        alert('Failed to delete meal');
      }
    })
    .catch(e => console.error(e));
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (addMenuItemIds.length === 0) return alert('Please select at least one menu item');
    
    setAddLoading(true);
    
    const addPromises = addMenuItemIds.map(itemId => {
      return fetch('http://localhost:8000/daily-menu/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: addDay,
          meal_type: addMealType,
          item_id: parseInt(itemId)
        })
      });
    });

    Promise.all(addPromises)
      .then(async (responses) => {
        const failedResponse = responses.find(r => !r.ok);
        if (!failedResponse) {
          setShowAddForm(false);
          fetchCalendar();
        } else {
          const err = await failedResponse.json().catch(() => ({ detail: "Unknown error" }));
          alert(`Failed to add some meals: ${err.detail}`);
        }
      })
      .catch(e => {
        console.error(e);
        alert('Error adding meal to schedule');
      })
      .finally(() => setAddLoading(false));
  };

  if (loading && days.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  // Find the selected day's data from our backend array
  const formattedSelectedDate = selectedDate.format('YYYY-MM-DD');
  const selectedDayData = days.find(d => d.date.startsWith(formattedSelectedDate));
  
  const displayDayName = selectedDate.format('dddd');
  const displayFormattedDate = selectedDate.format('MMM D, YYYY');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Menu Calendar</Typography>
          <Typography color="text.secondary">Select a date to view the scheduled meals</Typography>
        </Box>
        <Button 
          variant={showAddForm ? "outlined" : "contained"} 
          color={showAddForm ? "error" : "primary"}
          startIcon={showAddForm ? undefined : <AddIcon />}
          onClick={() => setShowAddForm(!showAddForm)}
          size="large"
          sx={{ fontWeight: 'bold' }}
        >
          {showAddForm ? 'Cancel Form' : 'Schedule New Meal'}
        </Button>
      </Box>

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
        </Paper>
      )}

      <Grid container spacing={4}>
         {/* LEFT PANE: Calendar Date Picker */}
         <Grid item xs={12} md={5} lg={4}>
           <Card elevation={2} sx={{ position: 'sticky', top: 20 }}>
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
         <Grid item xs={12} md={7} lg={8}>
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
                <Typography variant="h6" sx={{ opacity: 0.9 }}>{displayFormattedDate}</Typography>
              </Box>
              
              <CardContent sx={{ p: 0 }}>
                {!selectedDayData ? (
                   <Box sx={{ p: 6, textAlign: 'center' }}>
                     <Typography color="text.secondary" variant="subtitle1" fontStyle="italic">
                       This date falls outside of the current upcoming 30-day schedule window, or no schedule has been generated yet.
                     </Typography>
                   </Box>
                ) : (
                   <Grid container>
                     {['Breakfast', 'Lunch', 'Dinner'].map((mealType, index) => {
                        const mealsForType = selectedDayData.meals.filter(m => m.meal_type === mealType);
                        
                        return (
                          <Grid item xs={12} key={mealType} sx={{ borderBottom: index < 2 ? '1px solid #e0e0e0' : 'none', p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" color="text.secondary" gutterBottom sx={{ borderBottom: '2px solid', borderColor: mealType === 'Breakfast' ? '#f59e0b' : mealType === 'Lunch' ? '#10b981' : '#3b82f6', display: 'inline-block', pb: 0.5, mb: 3 }}>
                              {mealType}
                            </Typography>
                            
                            {mealsForType.length > 0 ? (
                              <Grid container spacing={2}>
                                {mealsForType.map((meal) => (
                                  <Grid item xs={12} sm={6} md={6} lg={6} key={meal.menu_id}>
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
                                        {meal.menu_item.calories && (
                                          <Chip 
                                            label={`${meal.menu_item.calories} cal`} 
                                            size="small" 
                                            variant="outlined"
                                          />
                                        )}
                                      </Box>

                                      <IconButton 
                                        className="delete-btn"
                                        size="small" 
                                        color="error" 
                                        sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'rgba(254, 226, 226, 0.5)', '&:hover': { bgcolor: '#fecaca' } }}
                                        onClick={() => handleDelete(meal.menu_id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
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
    </Box>
  );
}
