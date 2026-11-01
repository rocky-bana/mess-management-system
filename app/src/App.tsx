import { useEffect, useState } from 'react';
import { MenuItemsList } from './components/MenuItemsList';
import { CalendarView } from './components/CalendarView';
import { FeedbackWall } from './components/FeedbackWall';
import { ManageUsers } from './components/ManageUsers';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, CssBaseline, ThemeProvider, createTheme, Button, IconButton, Drawer, List, ListItemButton, ListItemText, ListItemIcon, Divider } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { ProfileDialog } from './components/ProfileDialog';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Professional blue
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    }
  }
});

type TabValue = 'calendar' | 'menu' | 'feedback' | 'manage-users';

const TAB_VALUES: TabValue[] = ['calendar', 'menu', 'feedback', 'manage-users'];

const getTabFromHash = (): TabValue | null => {
  const hash = window.location.hash.replace('#', '');
  return TAB_VALUES.find((tab) => tab === hash) ?? null;
};

function App() {
  const { currentUser, dbUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>(() => getTabFromHash() ?? 'calendar');
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Manage Users is admin-only; anything else falls back to the calendar
  const isAdmin = dbUser?.role === 'admin';
  const currentTab: TabValue = activeTab === 'manage-users' && !isAdmin ? 'calendar' : activeTab;

  // Keep the active tab in sync with the URL hash
  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    window.location.hash = newValue;
  };

  const navItems: { label: string; value: TabValue }[] = [
    { label: 'Monthly Calendar', value: 'calendar' },
    { label: 'Menu Items List', value: 'menu' },
    { label: 'Feedback Wall', value: 'feedback' },
    ...(isAdmin ? [{ label: 'Manage Users', value: 'manage-users' as TabValue }] : []),
  ];

  const handleNavSelect = (value: TabValue) => {
    setActiveTab(value);
    window.location.hash = value;
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={1}>
          <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', display: 'flex', alignItems: 'center', gap: 2, px: { xs: 1, md: 3 } }}>
            <IconButton
              edge="start"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: '1.2rem', md: '1.5rem' }, whiteSpace: 'nowrap' }}>
              Mess Management
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'block' }, flex: '1 1 0', minWidth: 0 }}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Monthly Calendar" value="calendar" sx={{ fontWeight: 600 }} />
                <Tab label="Menu Items List" value="menu" sx={{ fontWeight: 600 }} />
                <Tab label="Feedback Wall" value="feedback" sx={{ fontWeight: 600 }} />
                {isAdmin && (
                  <Tab label="Manage Users" value="manage-users" sx={{ fontWeight: 600 }} />
                )}
              </Tabs>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, ml: 'auto' }}>
              <Button
                color="inherit"
                onClick={() => setProfileOpen(true)}
                startIcon={<AccountCircleIcon />}
                sx={{ fontWeight: 'bold', color: 'text.secondary' }}
              >
                Profile<Box component="span" sx={{ display: { xs: 'none', lg: 'inline' }, ml: 0.5 }}>({dbUser?.name || 'User'})</Box>
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{ fontWeight: 'bold', color: 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          <Box sx={{ width: 260 }} role="navigation">
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', px: 2, py: 2 }}>
              Mess Management
            </Typography>
            <Divider />
            <List>
              {navItems.map((item) => (
                <ListItemButton key={item.value} selected={currentTab === item.value} onClick={() => handleNavSelect(item.value)}>
                  <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 600 } }} />
                </ListItemButton>
              ))}
            </List>
            <Divider />
            <List>
              <ListItemButton onClick={() => { setDrawerOpen(false); setProfileOpen(true); }}>
                <ListItemIcon sx={{ minWidth: 40 }}><AccountCircleIcon /></ListItemIcon>
                <ListItemText primary={`Profile (${dbUser?.name || 'User'})`} />
              </ListItemButton>
              <ListItemButton onClick={() => { setDrawerOpen(false); handleLogout(); }}>
                <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          </Box>
        </Drawer>

        <Box component="main" sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1200, width: '100%', mx: 'auto', flexGrow: 1 }}>
          <Box sx={{ animation: 'fadeIn 0.5s ease-in-out', '@media (prefers-reduced-motion: reduce)': { animation: 'none' }, '@keyframes fadeIn': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } } }}>
            {currentTab === 'calendar' && <CalendarView />}
            {currentTab === 'menu' && <MenuItemsList />}
            {currentTab === 'feedback' && <FeedbackWall />}
            {currentTab === 'manage-users' && isAdmin && <ManageUsers />}
          </Box>
        </Box>
        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
