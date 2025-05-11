// CountriesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';

import { useConfirm } from 'material-ui-confirm';

import api from '../api';

const CountriesManagement = () => {
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [countriesRes, currenciesRes] = await Promise.all([
        api.get('/country/'),
        api.get('/currency/currencies/'), // Adapter selon votre endpoint
      ]);
      setCountries(countriesRes.data);
      setCurrencies(currenciesRes.data);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { field: 'name', headerName: 'Nom', flex: 1 },
    { field: 'code_iso', headerName: 'Code ISO', width: 100 },
    { field: 'dial_code', headerName: 'Indicatif', width: 120 },
    {
      field: 'currency',
      headerName: 'Devise',
      width: 150,
      renderCell: (params) => <div>{params.row.currency?.code}</div>,
    },
    {
      field: 'can_send',
      headerName: 'Peut envoyer',
      width: 120,
      renderCell: (params) =>
        params.row.can_send ? (
          <CheckCircle color="success" />
        ) : (
          <Cancel color="error" />
        ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Modifier"
          onClick={() => {
            setSelectedCountry(params.row);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label="Supprimer"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  const handleSubmit = async (formData) => {
    try {
      if (selectedCountry) {
        const { currency_id, ...updateData } = formData;
        await api.patch(`/country/${formData.id}/`, updateData);
      } else {
        await api.post('/country/', formData);
      }
      fetchData();
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving country:', error);
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    try {
      await confirm({
        description: 'Êtes-vous sûr de vouloir supprimer ce pays ?',
      });
      await api.delete(`/country/${id}/`);
      fetchData();
    } catch (error) {
      if (!error.isConfirmed) return;
      console.error('Error deleting country:', error);
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ height: 600, width: '100%', p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Gestion des pays</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedCountry(null);
            setOpenDialog(true);
          }}
        >
          Ajouter un pays
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={countries}
        columns={columns}
        loading={loading}
        components={{
          Toolbar: () => (
            <GridToolbarContainer sx={{ p: 2 }}>
              <GridToolbarFilterButton />
              <GridToolbarExport />
            </GridToolbarContainer>
          ),
        }}
      />

      <CountryDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        country={selectedCountry}
        currencies={currencies}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

// CountryDialog.jsx
const CountryDialog = ({ open, onClose, country, currencies, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    code_iso: '',
    currency_id: '',
    dial_code: '',
    phone_pattern: '',
    can_send: true,
  });

  useEffect(() => {
    if (country) {
      setFormData({
        ...country,
        currency_id: country.currency?.id || '',
      });
    } else {
      setFormData({
        name: '',
        code_iso: '',
        currency_id: '',
        dial_code: '',
        phone_pattern: '',
        can_send: true,
      });
    }
  }, [country]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggle = (field) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{country ? 'Modifier le pays' : 'Nouveau pays'}</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }} gap={2} display="grid">
          <TextField
            label="Nom du pays"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
          />

          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
            <TextField
              label="Code ISO (ex: FR)"
              name="code_iso"
              value={formData.code_iso}
              onChange={handleChange}
              inputProps={{ maxLength: 3 }}
              required
            />

            <TextField
              select
              label="Devise"
              name="currency_id"
              value={formData.currency_id}
              onChange={handleChange}
              required
              disabled={!!country}
            >
              {currencies.map((currency) => (
                <MenuItem key={currency.id} value={currency.id}>
                  {currency.code} - {currency.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Indicatif téléphonique"
              name="dial_code"
              value={formData.dial_code}
              onChange={handleChange}
              required
            />
          </Box>

          <TextField
            label="Format de numéro (regex)"
            name="phone_pattern"
            value={formData.phone_pattern}
            onChange={handleChange}
            required
            helperText="Ex: ^\\+33[1-9]\\d{8}$"
          />

          <Box display="flex" alignItems="center" gap={1}>
            <Typography>Autoriser l'envoi</Typography>
            <IconButton onClick={() => handleToggle('can_send')}>
              {formData.can_send ? (
                <CheckCircle color="success" />
              ) : (
                <Cancel color="error" />
              )}
            </IconButton>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(formData)}
          disabled={!formData.currency_id || !formData.phone_pattern}
        >
          {country ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CountriesManagement;
