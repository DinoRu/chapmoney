import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
} from '@mui/x-data-grid';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useConfirm } from 'material-ui-confirm';

import api from '../api';

const schema = yup.object().shape({
  from_currency: yup.string().required('La devise source est obligatoire'),
  to_currency: yup
    .string()
    .required('La devise cible est obligatoire')
    .notOneOf(
      [yup.ref('from_currency')],
      'Les devises doivent être différentes',
    ),
  rate: yup
    .number()
    .typeError('Doit être un nombre')
    .positive('Le taux doit être positif')
    .required('Le taux est obligatoire'),
});

const ExchangeRates = () => {
  const [rates, setRates] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
  });
  const confirm = useConfirm();

  const fetchData = async () => {
    try {
      const [ratesRes, currenciesRes] = await Promise.all([
        api.get('/exchange-rates/'),
        api.get('/currency/currencies/'),
      ]);

      // Création d'une map pour les devises
      const currencyMap = currenciesRes.data.reduce(
        (acc, currency) => ({
          ...acc,
          [currency.id]: currency,
        }),
        {},
      );

      // Mappage des taux avec les noms de devises
      const formattedRates = ratesRes.data.map((rate) => ({
        ...rate,
        from_code: currencyMap[rate.from_currency_id]?.code || 'Inconnu',
        to_code: currencyMap[rate.to_currency_id]?.code || 'Inconnu',
        from_name: currencyMap[rate.from_currency_id]?.name || 'Inconnu',
        to_name: currencyMap[rate.to_currency_id]?.name || 'Inconnu',
      }));

      setRates(formattedRates);
      setCurrencies(currenciesRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de chargement');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = {
        from_currency_id: data.from_currency,
        to_currency_id: data.to_currency,
        rate: data.rate,
      };

      if (editingRate) {
        await api.patch(`/exchange-rates/${editingRate.id}`, payload);
      } else {
        await api.post('/exchange-rates/', payload);
      }

      await fetchData();
      setOpenDialog(false);
      reset();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    await confirm({
      description: 'Êtes-vous sûr de vouloir supprimer ce taux ?',
    });
    try {
      await api.delete(`/exchange-rates/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de suppression');
    }
  };

  const columns = [
    {
      field: 'from_code',
      headerName: 'Devise source',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <div>
          <div>{params.row.from_code}</div>
          {/* <div style={{ fontSize: '0.8em', color: '#666' }}>
            {params.row.from_name}
          </div> */}
        </div>
      ),
    },
    {
      field: 'to_code',
      headerName: 'Devise cible',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <div>
          <div>{params.row.to_code}</div>
          {/* <div style={{ fontSize: '0.8em', color: '#666' }}>
            {params.row.to_name}
          </div> */}
        </div>
      ),
    },
    {
      field: 'rate',
      headerName: 'Taux',
      flex: 1,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (params) => params.value,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Modifier"
          onClick={() => {
            setEditingRate(params.row);
            reset({
              from_currency: params.row.from_currency_id,
              to_currency: params.row.to_currency_id,
              rate: params.row.rate,
            });
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Delete color="error" />}
          label="Supprimer"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%', p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Gestion des taux de change</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Ajouter un taux
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={rates}
        columns={columns}
        components={{
          Toolbar: () => (
            <GridToolbarContainer sx={{ p: 2 }}>
              <GridToolbarExport />
            </GridToolbarContainer>
          ),
        }}
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editingRate ? 'Modifier le taux' : 'Nouveau taux de change'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Controller
                  name="from_currency"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Devise source</InputLabel>
                      <Select
                        {...field}
                        label="Devise source"
                        disabled={!!editingRate}
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="to_currency"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Devise cible</InputLabel>
                      <Select
                        {...field}
                        label="Devise cible"
                        disabled={!!editingRate}
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Controller
                name="rate"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Taux"
                    type="number"
                    inputProps={{ step: '0.0001' }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenDialog(false);
                reset();
                setEditingRate(null);
                setError(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="contained">
              {editingRate ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ExchangeRates;
