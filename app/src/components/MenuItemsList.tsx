import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Grid, CircularProgress, Alert, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { authFetch } from '../utils/api';

export interface MenuItem {
  item_id: number;
  name: string;
  description: string | null;
  is_vegetarian: boolean;
  calories: number | null;
}

type TypeFilter = 'all' | 'veg' | 'nonveg';

export function MenuItemsList() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    authFetch('/menu-items/')
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

  const query = search.trim().toLowerCase();
  const visibleItems = items.filter(item => {
    const matchesSearch = !query
      || item.name.toLowerCase().includes(query)
      || (item.description ?? '').toLowerCase().includes(query);
    const matchesType = typeFilter === 'all'
      || (typeFilter === 'veg' ? item.is_vegetarian : !item.is_vegetarian);
    return matchesSearch && matchesType;
  });

  return (
    <Box>
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
        <Typography variant="h4" fontWeight="bold">All Menu Items</Typography>
        <Typography color="text.secondary">Browse everything on the mess menu</Typography>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary" fontStyle="italic">No menu items found in the database.</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={typeFilter}
              onChange={(_, value: TypeFilter | null) => { if (value) setTypeFilter(value); }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="veg">Veg</ToggleButton>
              <ToggleButton value="nonveg">Non-Veg</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {visibleItems.length === 0 ? (
            <Typography color="text.secondary" fontStyle="italic">No items match your search.</Typography>
          ) : (
            <Grid container spacing={3}>
              {visibleItems.map((item) => (
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
                        {item.calories != null && (
                          <Chip label={`${item.calories} calories`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
