// components/PaymentMethods.jsx
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
} from '@mui/material';
import { Add, Edit, Delete, Phone, AccountBalance } from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useConfirm } from 'material-ui-confirm';

import api from '../api';

const schema = yup
  .object()
  .shape({
    type: yup.string().required('Le type est obligatoire'),
    owner_full_name: yup.string().required('Le nom complet est obligatoire'),
    country_id: yup.string().required('Le pays est obligatoire'),
    phone_number: yup.string().nullable(),
    account_number: yup.string().nullable(),
  })
  .test(
    'contact-required',
    'Au moins un contact (téléphone ou compte) est requis',
    function (value) {
      if (!value.phone_number && !value.account_number) {
        return this.createError({
          path: 'root.contact',
          message: 'Au moins un contact est requis',
        });
      }
      return true;
    },
  );

const PaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });
  const confirm = useConfirm();

  const fetchData = async () => {
    try {
      const [methodsRes, countriesRes] = await Promise.all([
        api.get('/payment-type/'),
        api.get('/country/'),
      ]);

      const countryMap = countriesRes.data.reduce(
        (acc, country) => ({
          ...acc,
          [country.id]: country.name,
        }),
        {},
      );

      setMethods(
        methodsRes.data.map((method) => ({
          ...method,
          country_name: countryMap[method.country_id] || 'Inconnu',
          contact: method.phone_number ? 'Téléphone' : 'Compte bancaire',
        })),
      );

      setCountries(countriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        phone_number: data.phone_number || null,
        account_number: data.account_number || null,
      };

      if (editingMethod) {
        await api.patch(`/payment-type/${editingMethod.id}`, payload);
      } else {
        api.post('/payment-type/', payload);
      }

      await fetchData();
      setOpenDialog(false);
      reset();
    } catch (error) {
      console.error('Error saving method:', error);
    }
  };

  const handleDelete = async (id) => {
    await confirm({
      description: 'Êtes-vous sûr de vouloir supprimer cette méthode ?',
    });
    try {
      await api.delete(`/payment-type/${id}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting method:', error);
    }
  };

  const columns = [
    {
      field: 'type',
      headerName: 'Type',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'owner_full_name',
      headerName: 'Propriétaire',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'contact',
      headerName: 'Contact',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Chip
          icon={params.value === 'Téléphone' ? <Phone /> : <AccountBalance />}
          label={params.value}
          color={params.value === 'Téléphone' ? 'primary' : 'secondary'}
        />
      ),
    },
    {
      field: 'country_name',
      headerName: 'Pays',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'actions',
      type: 'actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Modifier"
          onClick={() => {
            setEditingMethod(params.row);
            reset(params.row);
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
        <Typography variant="h4">Méthodes de paiement</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingMethod(null);
            reset();
            setOpenDialog(true);
          }}
        >
          Ajouter une méthode
        </Button>
      </Box>

      <DataGrid
        rows={methods}
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
          {editingMethod
            ? 'Modifier la méthode'
            : 'Nouvelle méthode de paiement'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Controller
                name="type"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Type de paiement"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="owner_full_name"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nom complet du propriétaire"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Controller
                  name="phone_number"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Numéro de téléphone"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="account_number"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Numéro de compte"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                    />
                  )}
                />
              </Box>

              <Controller
                name="country_id"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel>Pays</InputLabel>
                    <Select {...field} label="Pays">
                      {countries.map((country) => (
                        <MenuItem key={country.id} value={country.id}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                reset();
                setEditingMethod(null);
                setOpenDialog(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="contained" disabled={!isValid}>
              {editingMethod ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PaymentMethods;
