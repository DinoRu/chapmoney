// // NavbarComponent.jsx
// import { useState } from 'react';
// import {
//   AppBar,
//   Toolbar,
//   Typography,
//   IconButton,
//   Menu,
//   MenuItem,
//   Box,
//   useTheme,
//   Button,
// } from '@mui/material';
// import { Menu as MenuIcon } from '@mui/icons-material';
// import { Link, useLocation } from 'react-router-dom';

// const navItems = [
//   { label: 'Transactions', path: '/transactions' },
//   { label: 'Pays', path: '/countries' },
//   { label: 'Taux de change', path: '/exchange-rates' },
//   { label: 'Utilisateurs', path: '/users' },
// ];

// const Navbar = () => {
//   const [anchorEl, setAnchorEl] = useState(null);
//   const theme = useTheme();
//   const location = useLocation();

//   const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
//   const handleMenuClose = () => setAnchorEl(null);

//   return (
//     <AppBar
//       position="static"
//       sx={{ backgroundColor: theme.palette.background.paper }}
//     >
//       <Toolbar>
//         <IconButton
//           edge="start"
//           color="inherit"
//           onClick={handleMenuOpen}
//           sx={{ mr: 2, display: { sm: 'none' } }}
//         >
//           <MenuIcon />
//         </IconButton>

//         <Typography variant="h6" sx={{ flexGrow: 1 }}>
//           Administration
//         </Typography>

//         <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3 }}>
//           {navItems.map((item) => (
//             <Button
//               key={item.path}
//               component={Link}
//               to={item.path}
//               variant={location.pathname === item.path ? 'contained' : 'text'}
//               color="primary"
//             >
//               {item.label}
//             </Button>
//           ))}
//         </Box>

//         <Menu
//           anchorEl={anchorEl}
//           open={Boolean(anchorEl)}
//           onClose={handleMenuClose}
//           sx={{ display: { xs: 'block', sm: 'none' } }}
//         >
//           {navItems.map((item) => (
//             <MenuItem
//               key={item.path}
//               component={Link}
//               to={item.path}
//               onClick={handleMenuClose}
//             >
//               {item.label}
//             </MenuItem>
//           ))}
//         </Menu>
//       </Toolbar>
//     </AppBar>
//   );
// };

// export default Navbar;
