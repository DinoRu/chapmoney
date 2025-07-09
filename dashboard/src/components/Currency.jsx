import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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

const CurrencyDialog = ({ open, onClose, onSubmit }) => {
  const [formState, setFormState] = useState({
    code: '',
    name: '',
    symbol: '',
    isCrypto: false,
  });
  const [errors, setErrors] = useState({});
  const codeRef = useRef();

  useEffect(() => {
    if (open && codeRef.current) {
      setTimeout(() => codeRef.current.focus(), 100);
    }
  }, [open]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const { code, name, symbol, isCrypto } = formState;

    if (!code.trim()) {
      newErrors.code = 'Code requis';
    } else if (!isCrypto && code.length !== 3) {
      newErrors.code = 'Le code doit avoir 3 caractères';
    }

    if (isCrypto) {
      if (!name.trim()) newErrors.name = 'Nom requis';
      if (!symbol.trim()) newErrors.symbol = 'Symbole requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;

    const { code, isCrypto, name, symbol } = formState;
    onSubmit({
      code,
      is_crypto: isCrypto,
      ...(isCrypto && { name, symbol }),
    });

    setFormState({
      code: '',
      name: '',
      symbol: '',
      isCrypto: false,
    });
    setErrors({});
    onClose();
  }, [formState, onClose, onSubmit, validateForm]);

  const handleChange = useCallback(
    (field) => (e) => {
      const value =
        field === 'isCrypto'
          ? e.target.checked
          : field === 'code'
          ? e.target.value.toUpperCase()
          : e.target.value;

      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  const isFormValid = useMemo(() => {
    const { code, isCrypto, name, symbol } = formState;
    return code.length > 0 && (!isCrypto || (name && symbol));
  }, [formState]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onExited={() => setErrors({})}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Nouvelle devise</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formState.isCrypto}
                onChange={handleChange('isCrypto')}
                color="primary"
              />
            }
            label="Crypto-monnaie"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Code ISO (ex: USD)"
            value={formState.code}
            onChange={handleChange('code')}
            fullWidth
            required
            inputProps={{ maxLength: 10 }}
            inputRef={codeRef}
            error={!!errors.code}
            helperText={errors.code}
            sx={{ mb: 2 }}
          />

          {formState.isCrypto && (
            <>
              <TextField
                label="Nom complet"
                value={formState.name}
                onChange={handleChange('name')}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Symbole"
                value={formState.symbol}
                onChange={handleChange('symbol')}
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
          disabled={!isFormValid}
        >
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CustomToolbar = () => (
  <GridToolbarContainer sx={{ p: 1 }}>
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const CurrenciesManagement = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const confirm = useConfirm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/currency/currencies/');
      setCurrencies(response.data);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des devises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchWithCancel = async () => {
      try {
        setLoading(true);
        const response = await api.get('/currency/currencies/', {
          signal: abortController.signal,
        });
        setCurrencies(response.data);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError('Erreur lors du chargement des devises');
          console.error(err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchWithCancel();
    return () => abortController.abort();
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await confirm({
          description: 'Êtes-vous sûr de vouloir supprimer cette devise ?',
        });
        await api.delete(`/currency/${id}`);
        setCurrencies((prev) => prev.filter((currency) => currency.id !== id));
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setError('Erreur lors de la suppression');
          console.error(err);
        }
      }
    },
    [confirm],
  );

  const handleCreateCurrency = useCallback(async (data) => {
    try {
      const response = await api.post('/currency/', data);
      setCurrencies((prev) => [...prev, response.data]);
      setDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création');
      console.error(err);
    }
  }, []);

  const columns = useMemo(
    () => [
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
            onClick={() => handleDelete(params.id)}
          />,
        ],
      },
    ],
    [handleDelete],
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '70vh', width: '100%', p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Gestion des devises</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Ajouter une devise
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={currencies}
        columns={columns}
        getRowId={(row) => row.id}
        components={{ Toolbar: CustomToolbar }}
        disableSelectionOnClick
        density="comfortable"
        autoPageSize
      />

      <CurrencyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateCurrency}
      />
    </Box>
  );
};

export default CurrenciesManagement;
