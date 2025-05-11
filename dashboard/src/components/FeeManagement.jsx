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
import api from '../api'; // Importez votre instance api configurée

const schema = yup.object().shape({
  from_country: yup.string().required("Le pays d'origine est obligatoire"),
  to_country: yup
    .string()
    .required('Le pays de destination est obligatoire')
    .notOneOf([yup.ref('from_country')], 'Les pays doivent être différents'),
  fee: yup
    .number()
    .typeError('Doit être un nombre')
    .positive('Le frais doit être positif')
    .required('Le montant est obligatoire'),
});

const FeesManagement = () => {
  const [fees, setFees] = useState([]);
  const [countries, setCountries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [error, setError] = useState(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
  });
  const confirm = useConfirm();

  const fetchData = async () => {
    try {
      const [feesRes, countriesRes] = await Promise.all([
        api.get('/fees/'),
        api.get('/country/'),
      ]);

      const countryMap = countriesRes.data.reduce(
        (acc, country) => ({
          ...acc,
          [country.id]: country.name,
        }),
        {},
      );

      setFees(
        feesRes.data.map((fee) => ({
          ...fee,
          from_country_name: countryMap[fee.from_country_id],
          to_country_name: countryMap[fee.to_country_id],
        })),
      );

      setCountries(countriesRes.data);
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
        from_country_id: data.from_country,
        to_country_id: data.to_country,
        fee: data.fee,
      };

      if (editingFee) {
        await api.put(`/fees/${editingFee.id}`, { fee: data.fee });
      } else {
        await api.post('/fees/', payload);
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
      description: 'Êtes-vous sûr de vouloir supprimer ces frais ?',
    });
    try {
      await api.delete(`/fees/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de suppression');
    }
  };

  const columns = [
    {
      field: 'from_country_name',
      headerName: "Pays d'origine",
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'to_country_name',
      headerName: 'Pays de destination',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'fee',
      headerName: 'Frais (%)',
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
            setEditingFee(params.row);
            reset({
              from_country: params.row.from_country_id,
              to_country: params.row.to_country_id,
              fee: params.row.fee,
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
        <Typography variant="h4">Gestion des frais</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Ajouter des frais
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={fees}
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
          {editingFee ? 'Modifier les frais' : 'Nouveaux frais'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Controller
                  name="from_country"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Pays d'origine</InputLabel>
                      <Select
                        {...field}
                        label="Pays d'origine"
                        disabled={!!editingFee}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.id} value={country.id}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="to_country"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Pays de destination</InputLabel>
                      <Select
                        {...field}
                        label="Pays de destination"
                        disabled={!!editingFee}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.id} value={country.id}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Controller
                name="fee"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Frais (%)"
                    type="number"
                    inputProps={{ step: '0.01' }}
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
                setEditingFee(null);
                setError(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="contained">
              {editingFee ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FeesManagement;
