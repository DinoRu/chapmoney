import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from '@mui/x-data-grid';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useConfirm } from 'material-ui-confirm';
import api from '../api';

const CurrenciesManagement = () => {
  const [currencies, setCurrencies] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/currency/currencies/');
      const withId = response.data.map((currency) => ({
        ...currency,
        id: currency.id, // UUID bien présent
      }));
      setCurrencies(withId);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des devises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await confirm({
        description: 'Êtes-vous sûr de vouloir supprimer cette devise ?',
      });

      await api.delete(`/currency/${id}`);
      fetchData();
    } catch (error) {
      // Annulation par l'utilisateur
      if (error.name === 'CanceledError') return;

      console.error('Erreur lors de la suppression :', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleCreateCurrency = async (data) => {
    try {
      await api.post('/currency/', data);
      fetchData();
      setOpenDialog(false);
    } catch (error) {
      console.error('Erreur lors de la création :', error);
      setError(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const columns = [
    { field: 'code', headerName: 'Code', flex: 1 },
    { field: 'name', headerName: 'Nom', flex: 1 },
    { field: 'symbol', headerName: 'Symbole', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label="Supprimer"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  if (loading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ height: 600, width: '100%', p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Gestion des devises</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Ajouter une devise
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={currencies}
        columns={columns}
        getRowId={(row) => row.id} // UUID ici
        components={{
          Toolbar: () => (
            <GridToolbarContainer sx={{ p: 2 }}>
              <GridToolbarFilterButton />
              <GridToolbarExport />
            </GridToolbarContainer>
          ),
        }}
      />

      <CurrencyDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={handleCreateCurrency}
      />
    </Box>
  );
};

// CurrencyDialog.jsx (inchangé)
const CurrencyDialog = ({ open, onClose, onSubmit }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [isCrypto, setIsCrypto] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!code) newErrors.code = 'Code requis';

    if (isCrypto) {
      if (!name) newErrors.name = 'Nom requis';
      if (!symbol) newErrors.symbol = 'Symbole requis';
    } else {
      if (code.length !== 3) {
        newErrors.code = 'Le code doit avoir 3 caractères';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data = {
      code,
      is_crypto: isCrypto,
    };

    if (isCrypto) {
      data.name = name;
      data.symbol = symbol;
    }

    onSubmit(data);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setSymbol('');
    setIsCrypto(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nouvelle devise</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isCrypto}
                onChange={(e) => setIsCrypto(e.target.checked)}
                color="primary"
              />
            }
            label="Crypto-monnaie"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Code ISO (ex: USD)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            fullWidth
            required
            inputProps={{ maxLength: 10 }}
            sx={{ mt: 2, mb: 2 }}
          />

          {isCrypto && (
            <>
              <TextField
                label="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Symbole"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                fullWidth
                required
                error={!!errors.symbol}
                helperText={errors.symbol}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!code || (isCrypto ? !name || !symbol : code.length !== 3)}
        >
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CurrenciesManagement;
