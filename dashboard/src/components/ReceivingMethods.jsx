import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
} from '@mui/x-data-grid';
import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import { Add, Edit, Delete, Info } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../api';

// Schéma de validation amélioré
const schema = yup.object({
  country_id: yup.string().required('Le pays est obligatoire'),
  is_crypto_receiver: yup.boolean().required(),
  type: yup.string().when('is_crypto_receiver', {
    is: false,
    then: (schema) => schema.required('Le type est obligatoire'),
    otherwise: (schema) => schema.nullable(),
  }),
  network: yup.string().when('is_crypto_receiver', {
    is: true,
    then: (schema) => schema.required('Le réseau est obligatoire'),
    otherwise: (schema) => schema.nullable(),
  }),
});

const cryptoNetworks = [
  'ERC20',
  'TRC20',
  'BEP20',
  'Polygon',
  'Solana',
  'Bitcoin',
  'Litecoin',
  'Ripple',
  'Stellar',
  'Tron',
];

// Composant Dialog séparé
const ReceivingMethodDialog = ({
  open,
  onClose,
  onSubmit,
  countries,
  cryptoCountries,
  editingMethod,
  error,
  setError,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      is_crypto_receiver: false,
      type: '',
      network: '',
      country_id: '',
    },
  });

  const countryId = watch('country_id');
  const isCryptoReceiver = watch('is_crypto_receiver');

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (open) {
      if (editingMethod) {
        reset({
          country_id: editingMethod.country_id,
          is_crypto_receiver: editingMethod.is_crypto_receiver,
          type: editingMethod.type || '',
          network: editingMethod.network || '',
        });
      } else {
        reset({
          is_crypto_receiver: false,
          type: '',
          network: '',
          country_id: '',
        });
      }
      setError('');
    }
  }, [open, editingMethod, reset, setError]);

  // Mettre à jour le type de méthode en fonction du pays sélectionné
  useEffect(() => {
    if (countryId && countries.length > 0) {
      const selectedCountry = countries.find((c) => c.id === countryId);
      if (selectedCountry) {
        const isCrypto = !!selectedCountry.is_virtual;
        setValue('is_crypto_receiver', isCrypto);

        // Définir une valeur par défaut pour le réseau crypto
        if (isCrypto && !watch('network')) {
          setValue('network', cryptoNetworks[0]);
        }
      }
    }
  }, [countryId, countries, setValue, watch]);

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editingMethod
          ? 'Modifier la méthode'
          : 'Nouvelle méthode de réception'}
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Controller
              name="country_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.country_id}>
                  <InputLabel>Pays associé *</InputLabel>
                  <Select
                    {...field}
                    label="Pays associé *"
                    onChange={(e) => {
                      field.onChange(e);
                      setValue('country_id', e.target.value);
                    }}
                  >
                    {countries.map((country) => (
                      <MenuItem key={country.id} value={country.id}>
                        {country.name}
                        {country.is_virtual && ` (${country.currency?.code})`}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.country_id && (
                    <Typography variant="caption" color="error">
                      {errors.country_id.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            {isCryptoReceiver ? (
              <Controller
                name="network"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.network}>
                    <InputLabel>Réseau blockchain *</InputLabel>
                    <Select {...field} label="Réseau blockchain *">
                      {cryptoNetworks.map((network) => (
                        <MenuItem key={network} value={network}>
                          {network}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.network && (
                      <Typography variant="caption" color="error">
                        {errors.network.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            ) : (
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Type de réception *"
                    placeholder="Mobile Money, Virement Bancaire, etc."
                    error={!!errors.type}
                    helperText={errors.type?.message}
                    fullWidth
                  />
                )}
              />
            )}

            {countryId && (
              <Alert severity="info" icon={<Info />}>
                {isCryptoReceiver
                  ? 'Méthode pour crypto-monnaie : le réseau blockchain est requis'
                  : 'Méthode traditionnelle : le type de réception est requis'}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Annuler
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {editingMethod ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

// Composant principal optimisé
const ReceivingMethods = () => {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cryptoCountries, setCryptoCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);

  // Récupération des données avec gestion d'annulation
  const fetchData = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError('');

      const [methodsRes, countriesRes] = await Promise.all([
        api.get('/receiving-type/', { signal }),
        api.get('/country/', { signal }),
      ]);

      // Création d'une map pour les pays
      const countryMap = countriesRes.data.reduce((map, country) => {
        map[country.id] = country;
        return map;
      }, {});

      // Formatage des méthodes
      const formattedMethods = methodsRes.data.map((method) => ({
        ...method,
        country_name: countryMap[method.country_id]?.name || 'Inconnu',
        currency_code: countryMap[method.country_id]?.currency?.code || '',
      }));

      setMethods(formattedMethods);
      setCountries(countriesRes.data);
      setCryptoCountries(
        countriesRes.data.filter((country) => country.is_virtual),
      );
    } catch (err) {
      if (!signal?.aborted) {
        setError('Erreur de récupération des données');
        console.error(err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController.signal);

    return () => abortController.abort();
  }, [fetchData]);

  // Soumission du formulaire
  const handleSubmit = useCallback(
    async (data) => {
      try {
        setError('');
        const payload = {
          country_id: data.country_id,
          is_crypto_receiver: data.is_crypto_receiver,
          type: data.is_crypto_receiver ? null : data.type,
          network: data.is_crypto_receiver ? data.network : null,
        };

        let newMethod;
        if (editingMethod) {
          const response = await api.patch(
            `/receiving-type/update/${editingMethod.id}`,
            payload,
          );
          newMethod = response.data;
        } else {
          const response = await api.post('/receiving-type/type', payload);
          newMethod = response.data;
        }

        // Mise à jour locale
        setMethods((prev) => {
          const country = countries.find((c) => c.id === newMethod.country_id);
          const formattedMethod = {
            ...newMethod,
            country_name: country?.name || 'Inconnu',
            currency_code: country?.currency?.code || '',
          };

          return editingMethod
            ? prev.map((m) => (m.id === editingMethod.id ? formattedMethod : m))
            : [...prev, formattedMethod];
        });

        setDialogOpen(false);
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || 'Erreur lors de la sauvegarde';
        setError(errorMsg);
        console.error(err);
      }
    },
    [editingMethod, countries],
  );

  // Suppression d'une méthode
  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/receiving-type/${id}`);
      setMethods((prev) => prev.filter((method) => method.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  }, []);

  // Colonnes mémoïsées
  const columns = useMemo(
    () => [
      {
        field: 'method_display',
        headerName: 'Méthode',
        flex: 1,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => (
          <Box display="flex" alignItems="center" gap={1}>
            {params.row.is_crypto_receiver ? (
              <>
                <Chip
                  label={params.row.network}
                  color="secondary"
                  size="small"
                />
                <Typography variant="body2">
                  ({params.row.currency_code})
                </Typography>
              </>
            ) : (
              <Typography variant="body2">{params.row.type}</Typography>
            )}
          </Box>
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
        field: 'is_crypto',
        headerName: 'Type',
        width: 120,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) =>
          params.row.is_crypto_receiver ? (
            <Chip label="Crypto" color="secondary" size="small" />
          ) : (
            <Chip label="Fiat" color="primary" size="small" />
          ),
      },
      {
        field: 'actions',
        type: 'actions',
        width: 100,
        getActions: (params) => [
          <GridActionsCellItem
            icon={<Edit />}
            label="Modifier"
            onClick={() => {
              setEditingMethod(params.row);
              setDialogOpen(true);
            }}
          />,
          <GridActionsCellItem
            icon={<Delete color="error" />}
            label="Supprimer"
            onClick={() => handleDelete(params.row.id)}
          />,
        ],
      },
    ],
    [handleDelete],
  );

  return (
    <Box sx={{ height: '70vh', width: '100%', p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Méthodes de réception</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingMethod(null);
            setDialogOpen(true);
          }}
        >
          Ajouter une méthode
        </Button>
      </Box>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={methods}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        components={{
          Toolbar: () => (
            <GridToolbarContainer sx={{ p: 1 }}>
              <GridToolbarExport />
            </GridToolbarContainer>
          ),
        }}
        disableSelectionOnClick
        density="comfortable"
        autoPageSize
      />

      <ReceivingMethodDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        countries={countries}
        cryptoCountries={cryptoCountries}
        editingMethod={editingMethod}
        error={error}
        setError={setError}
      />
    </Box>
  );
};

export default ReceivingMethods;
