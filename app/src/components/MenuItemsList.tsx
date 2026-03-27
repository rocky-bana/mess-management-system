import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Grid, CircularProgress, Alert } from '@mui/material';
import { API_BASE_URL } from '../utils/api';

export interface MenuItem {
  item_id: number;
  name: string;
  description: string | null;
  is_vegetarian: boolean;
  calories: number | null;
}

export function MenuItemsList() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/menu-items/`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(e => {
        console.error("Fetching error:", e);
        setError("Failed to fetch menu items. Is the backend running?");
        setLoading(false);
      });
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, mb: 3 }}>
        All Menu Items
      </Typography>
      
      {items.length === 0 ? (
        <Typography color="text.secondary" fontStyle="italic">No menu items found in the database.</Typography>
      ) : (
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid key={item.item_id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" component="h3" gutterBottom fontWeight="bold">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph sx={{ flexGrow: 1 }}>
                    {item.description || "No description provided."}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={item.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'} 
                      color={item.is_vegetarian ? 'success' : 'error'} 
                      size="small" 
                    />
                    {item.calories && (
                      <Chip label={`${item.calories} calories`} size="small" variant="outlined" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
