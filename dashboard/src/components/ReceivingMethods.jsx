import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Add, Edit, Delete, Info } from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../api';

const schema = yup.object({
  country_id: yup.string().required('Le pays est obligatoire'),
  is_crypto_receiver: yup.boolean().required(),
  type: yup.string().when('is_crypto_receiver', (isCrypto, schema) => {
    return !isCrypto
      ? schema.required('Le type est obligatoire')
      : schema.nullable(true);
  }),
  network: yup.string().when('is_crypto_receiver', (isCrypto, schema) => {
    return isCrypto
      ? schema.required('Le réseau est obligatoire')
      : schema.nullable(true);
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

const ReceivingMethods = () => {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cryptoCountries, setCryptoCountries] = useState([]);

  const { control, handleSubmit, reset, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      is_crypto_receiver: false,
      type: '',
      network: '',
      country_id: '',
    },
  });

  const isCryptoReceiver = watch('is_crypto_receiver');
  const countryId = watch('country_id');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [methodsRes, countriesRes] = await Promise.all([
          api.get('/receiving-type/'),
          api.get('/country/'),
        ]);

        // Filtrer les pays cryptos
        const cryptoCountries = countriesRes.data.filter(
          (country) => country.is_virtual,
        );
        setCryptoCountries(cryptoCountries);

        const countryMap = countriesRes.data.reduce((acc, country) => {
          acc[country.id] = country;
          return acc;
        }, {});

        setMethods(
          methodsRes.data.map((method) => ({
            ...method,
            country_name: countryMap[method.country_id]?.name || 'Inconnu',
            currency_code: countryMap[method.country_id]?.currency?.code || '',
          })),
        );
        setCountries(countriesRes.data);
        setError('');
      } catch (err) {
        setError('Erreur de récupération des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (countryId) {
      const selectedCountry = countries.find((c) => c.id === countryId);
      if (selectedCountry) {
        const isCrypto = selectedCountry.is_virtual;
        setValue('is_crypto_receiver', isCrypto);

        if (isCrypto) {
          const currentNetwork = watch('network');
          if (!currentNetwork || !cryptoNetworks.includes(currentNetwork)) {
            setValue('network', cryptoNetworks[0]);
          }
        } else {
          setValue('network', '');
        }
      }
    }
  }, [countryId, countries, setValue, watch]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        type: data.is_crypto_receiver ? null : data.type,
        network: data.is_crypto_receiver ? data.network : null,
      };

      if (editingMethod) {
        await api.patch(`/receiving-type/update/${editingMethod.id}`, payload);
      } else {
        await api.post('/receiving-type/type', payload);
      }

      // Recharger les données
      const methodsRes = await api.get('/receiving-type/');
      const countryMap = countries.reduce((acc, country) => {
        acc[country.id] = country;
        return acc;
      }, {});

      setMethods(
        methodsRes.data.map((method) => ({
          ...method,
          country_name: countryMap[method.country_id]?.name || 'Inconnu',
          currency_code: countryMap[method.country_id]?.currency?.code || '',
        })),
      );

      handleCloseDialog();
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'Erreur lors de la sauvegarde';
      setError(errorMsg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/receiving-type/${id}`);

      // Mettre à jour l'état local après suppression
      setMethods(methods.filter((method) => method.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMethod(null);
    reset({
      is_crypto_receiver: false,
      type: '',
      network: '',
      country_id: '',
    });
    setError('');
  };

  const columns = [
    {
      field: 'method_display',
      headerName: 'Méthode',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const { is_crypto_receiver, network, type, currency_code } = params.row;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            {is_crypto_receiver ? (
              <>
                <Chip label={network} color="secondary" size="small" />
                <Typography variant="body2">({currency_code})</Typography>
              </>
            ) : (
              <Typography variant="body2">{type}</Typography>
            )}
          </Box>
        );
      },
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
            reset({
              is_crypto_receiver: params.row.is_crypto_receiver,
              type: params.row.type || '',
              network: params.row.network || '',
              country_id: params.row.country_id,
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
        <Typography variant="h4">Méthodes de réception</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Ajouter une méthode
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
            <GridToolbarContainer sx={{ p: 2 }}>
              <GridToolbarExport />
            </GridToolbarContainer>
          ),
        }}
      />

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingMethod
            ? 'Modifier la méthode'
            : 'Nouvelle méthode de réception'}
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ mt: 2 }} gap={2} display="grid">
              {/* Sélecteur de pays */}
              <Controller
                name="country_id"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel id="country-label">Pays associé</InputLabel>
                    <Select
                      labelId="country-label"
                      label="Pays associé"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      required
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.id} value={country.id}>
                          {country.name}{' '}
                          {country.is_virtual && `(${country.currency?.code})`}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              {/* Si crypto, afficher le champ network */}
              {isCryptoReceiver && (
                <>
                  <Controller
                    name="network"
                    control={control}
                    render={({ field, fieldState }) => {
                      const labelId = 'network-label';
                      return (
                        <FormControl fullWidth error={!!fieldState.error}>
                          <InputLabel id={labelId}>
                            Réseau blockchain
                          </InputLabel>
                          <Select
                            labelId={labelId}
                            label="Réseau blockchain"
                            value={field.value || ''}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setValue('network', e.target.value);
                            }}
                            required
                          >
                            {cryptoNetworks.map((network) => (
                              <MenuItem key={network} value={network}>
                                {network}
                              </MenuItem>
                            ))}
                          </Select>
                          {fieldState.error && (
                            <Typography variant="caption" color="error">
                              {fieldState.error.message}
                            </Typography>
                          )}
                        </FormControl>
                      );
                    }}
                  />
                </>
              )}
              {!isCryptoReceiver && (
                // Sinon, champ "type" pour les méthodes classiques
                <Controller
                  name="type"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Type de réception"
                      placeholder="Mobile Money, Virement Bancaire, etc."
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                      required
                    />
                  )}
                />
              )}

              {/* Message d'info */}
              {countryId && (
                <Alert severity="info" icon={<Info />}>
                  {isCryptoReceiver
                    ? 'Méthode pour crypto-monnaie : le réseau blockchain est requis'
                    : 'Méthode traditionnelle : le type de réception est requis'}
                </Alert>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Annuler
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {editingMethod ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ReceivingMethods;
