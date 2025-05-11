// components/ExchangeRates.jsx
import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
  // GridToolbarFilterButton,
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
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import config from '../config';

const API_URL = `${config().API_URL}/currency`;

const schema = yup.object().shape({
  currency: yup.string().required().length(3),
  rate: yup.number().required().positive(),
});

const ExchangeRates = () => {
  const [rates, setRates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
  });

  const fetchRates = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/rates`);
      console.log(data);
      setRates(
        Object.entries(data.conversion_rates).map(([currency, rate]) => ({
          id: currency,
          currency,
          rate,
        })),
      );
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const onSubmit = async (data) => {
    try {
      await axios.post(`${API_URL}/rate`, {
        base_code: 'USD',
        conversion_rates: { [data.currency]: data.rate },
      });
      await fetchRates();
      setOpenDialog(false);
      reset();
    } catch (error) {
      console.error('Error saving rate:', error);
    }
  };

  const columns = [
    {
      field: 'currency',
      headerName: 'Devise',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'rate',
      headerName: 'Taux (USD)',
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
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Modifier"
          onClick={() => {
            setEditingRate(params.row);
            reset(params.row);
            setOpenDialog(true);
          }}
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
        maxWidth="sm"
      >
        <DialogTitle>
          {editingRate ? 'Modifier le taux' : 'Nouveau taux de change'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ mt: 2 }} gap={2} display="grid">
              <Controller
                name="currency"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Code devise (ISO)"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={!!editingRate}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="rate"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Taux contre USD"
                    type="number"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    inputProps={{ step: '0.000001' }}
                    fullWidth
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenDialog(false);
                reset();
                setEditingRate(null);
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
