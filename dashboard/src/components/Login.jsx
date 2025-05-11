import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import axios from 'axios';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import config from '../config';

const API_URL = `${config().API_URL}/users/login`;

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    credential: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}`, credentials);

      if (response.data.role !== 'admin') {
        throw new Error('Accès réservé aux administrateurs');
      }

      localStorage.setItem('adminToken', response.data.access_token); // Changé de 'access_token'
      localStorage.setItem('refresh_token', response.data.refresh_token); // Gardez celui-ci
      localStorage.setItem('adminUser', JSON.stringify(response.data));

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Connexion Admin
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            margin="normal"
            label="Email ou Téléphone"
            value={credentials.credential}
            onChange={(e) =>
              setCredentials({ ...credentials, credential: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="normal"
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                    type="button"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }}>
            Se connecter
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default AdminLogin;
