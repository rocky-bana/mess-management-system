import { useState } from 'react';
import { MenuItemsList } from './components/MenuItemsList';
import { CalendarView } from './components/CalendarView';
import { FeedbackWall } from './components/FeedbackWall';
import { ManageUsers } from './components/ManageUsers';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, CssBaseline, ThemeProvider, createTheme, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
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

function App() {
  const { currentUser, dbUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'menu' | 'feedback' | 'manage-users'>('calendar');
  const [profileOpen, setProfileOpen] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'calendar' | 'menu' | 'feedback' | 'manage-users') => {
    setActiveTab(newValue);
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
          <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', display: 'flex', flexWrap: 'wrap', gap: 2, py: { xs: 1, sm: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main', mr: 4 }}>
                Mess Management
              </Typography>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Monthly Calendar" value="calendar" sx={{ fontWeight: 600 }} />
                <Tab label="Menu Items List" value="menu" sx={{ fontWeight: 600 }} />
                <Tab label="Feedback Wall" value="feedback" sx={{ fontWeight: 600 }} />
                {dbUser?.role === 'admin' && (
                  <Tab label="Manage Users" value="manage-users" sx={{ fontWeight: 600 }} />
                )}
              </Tabs>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                onClick={() => setProfileOpen(true)}
                startIcon={<AccountCircleIcon />}
                sx={{ fontWeight: 'bold', color: 'text.secondary' }}
              >
                Profile ({dbUser?.name || 'User'})
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

        <Box component="main" sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1200, width: '100%', mx: 'auto', flexGrow: 1 }}>
          <Box sx={{ animation: 'fadeIn 0.5s ease-in-out', '@keyframes fadeIn': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } } }}>
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'menu' && <MenuItemsList />}
            {activeTab === 'feedback' && <FeedbackWall />}
            {activeTab === 'manage-users' && dbUser?.role === 'admin' && <ManageUsers />}
          </Box>
        </Box>
        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
