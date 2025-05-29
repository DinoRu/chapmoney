import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
} from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  IconButton,
  Box,
  // Typography,
  Badge,
  Button,
  Divider,
  Drawer,
  List,
  // ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect, useMemo } from 'react';
import Brightness7 from '@mui/icons-material/Brightness7';
import Brightness4 from '@mui/icons-material/Brightness4';
import { ConfirmProvider } from 'material-ui-confirm';

// Composants
import logo from './assets/logo.png';
import TransactionTable from './components/AdminDashboard';
// import ExchangeRates from './components/ExchangeRates';
import UserManagement from './components/UserManagement';
import CountriesManagement from './components/CountriesPage';
import ReceivingMethods from './components/ReceivingMethods';
import PaymentMethods from './components/PaymentMethods';
import FeesManagement from './components/FeeManagement';
import NotificationHandler from './components/NotificationHandler';
import NotificationsPage from './components/NotificationPage';
import Rates from './components/Rates';
import AdminLogin from './components/Login';
import ProtectedRoute from './components/ProtectedRoutes';
import CurrencyManagement from './components/Currency';
import TransactionDetailPage from './components/TransactionDetaill';
const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
    components: {
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: mode === 'light' ? '#f5f5f5' : '#1e1e1e',
              borderRadius: 8,
            },
          },
        },
      },
    },
  });

function Navbar({ toggleTheme, mode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const allRoutes = [
    { path: '/transactions', label: 'Transactions' },
    { path: '/countries', label: 'Pays' },
    { path: '/currencies', label: 'Devises' },
    { path: '/rates', label: 'Taux échanges' },
    { path: '/fees', label: 'Frais' },
    { path: '/receiving-methods', label: 'Réception' },
    { path: '/payment-methods', label: 'Paiement' },
    { path: '/users', label: 'Utilisateurs' },
  ];

  const primaryRoutes = allRoutes.slice(0, 5);
  const secondaryRoutes = allRoutes.slice(5);

  useEffect(() => {
    const ws = new WebSocket(
      'ws://localhost/api/v1/transactions/ws/transactions',
    );
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_TRANSACTION')
        setNotificationCount((prev) => prev + 1);
    };
    return () => ws.close();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ width: 250 }}>
      <List>
        {allRoutes.map((route) => (
          <ListItemButton
            key={route.path}
            component={Link}
            to={route.path}
            selected={location.pathname === route.path}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemText primary={route.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <ListItemButton onClick={handleLogout} sx={{ color: 'error.main' }}>
        <ListItemText primary="Déconnexion" />
      </ListItemButton>
    </Box>
  );

  return (
    <AppBar position="static" color="default">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{
              width: 60,
              height: 50,
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
          {!isMobile && (
            <Tabs value={location.pathname} sx={{ ml: 2 }}>
              {primaryRoutes.map((route) => (
                <Tab
                  key={route.path}
                  label={route.label}
                  value={route.path}
                  component={Link}
                  to={route.path}
                />
              ))}
              {secondaryRoutes.length > 0 && (
                <Tab
                  label="Plus ▼"
                  component={Button}
                  onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                />
              )}
            </Tabs>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => navigate('/notifications')}
          >
            <Badge
              badgeContent={notificationCount}
              color="error"
              sx={{ '& .MuiBadge-badge': { top: 8, right: 8 } }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>
          {!isMobile && (
            <Button color="error" variant="contained" onClick={handleLogout}>
              Déconnexion
            </Button>
          )}
        </Box>

        {isMobile && (
          <>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right" // Menu qui s'ouvre depuis la droite
              open={mobileOpen}
              onClose={handleDrawerToggle}
            >
              {drawerContent}
            </Drawer>
          </>
        )}

        {!isMobile && secondaryRoutes.length > 0 && (
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={() => setMobileMenuAnchor(null)}
          >
            {secondaryRoutes.map((route) => (
              <MenuItem
                key={route.path}
                component={Link}
                to={route.path}
                onClick={() => setMobileMenuAnchor(null)}
              >
                {route.label}
              </MenuItem>
            ))}
          </Menu>
        )}
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <ConfirmProvider>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <LayoutWrapper toggleTheme={toggleTheme} mode={mode} />
                }
              >
                <Route path="/transactions" element={<TransactionTable />} />
                <Route path="/countries" element={<CountriesManagement />} />
                <Route path="/currencies" element={<CurrencyManagement />} />
                <Route path="/rates" element={<Rates />} />
                {/* <Route path="/exchange-rates" element={<ExchangeRates />} /> */}
                <Route path="/fees" element={<FeesManagement />} />
                <Route
                  path="/receiving-methods"
                  element={<ReceivingMethods />}
                />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/" element={<TransactionTable />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route
                  path="/transactions/:id"
                  element={<TransactionDetailPage />}
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

const LayoutWrapper = ({ toggleTheme, mode }) => (
  <>
    <Navbar toggleTheme={toggleTheme} mode={mode} />
    <NotificationHandler />
    <Outlet />
  </>
);

export default App;
