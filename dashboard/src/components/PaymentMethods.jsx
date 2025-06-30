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
  FormControl,
  InputLabel,
  Chip,
  Select,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Phone,
  AccountBalance,
  CurrencyBitcoin,
} from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useConfirm } from 'material-ui-confirm';
import api from '../api';

// Définir les réseaux crypto
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

// Schéma de validation
const schema = yup.object().shape({
  country_id: yup.string().required('Le pays est obligatoire'),
  is_crypto_pay: yup.boolean().required(),

  type: yup.string().when('is_crypto_pay', {
    is: (val) => val === false,
    then: (schema) => schema.required('Le type est obligatoire'),
    otherwise: (schema) => schema.nullable(true),
  }),

  network: yup.string().when('is_crypto_pay', {
    is: true,
    then: (schema) => schema.required('Le réseau est obligatoire'),
    otherwise: (schema) => schema.nullable(true),
  }),

  crypto_address: yup.string().when('is_crypto_pay', {
    is: true,
    then: (schema) => schema.required("L'adresse crypto est obligatoire"),
    otherwise: (schema) => schema.nullable(true),
  }),

  owner_full_name: yup.string().required('Le nom complet est obligatoire'),

  phone_number: yup.string().nullable(),
  account_number: yup.string().nullable(),
});

const PaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { control, handleSubmit, reset, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      is_crypto_pay: false,
      type: '',
      network: '',
      crypto_address: '',
      owner_full_name: '',
      phone_number: '',
      account_number: '',
      country_id: '',
    },
  });

  const countryId = watch('country_id');
  const isCryptoPay = watch('is_crypto_pay');
  const confirm = useConfirm();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [methodsRes, countriesRes] = await Promise.all([
          api.get('/payment-type/'),
          api.get('/country/'),
        ]);

        const countryMap = countriesRes.data.reduce((acc, country) => {
          acc[country.id] = country;
          return acc;
        }, {});

        setMethods(
          methodsRes.data.map((method) => ({
            ...method,
            country_name: countryMap[method.country_id]?.name || 'Inconnu',
            // Déterminer le type de contact pour l'affichage
            contact: method.crypto_address
              ? 'Crypto'
              : method.phone_number
              ? 'Téléphone'
              : 'Compte bancaire',
            contact_value:
              method.crypto_address ||
              method.phone_number ||
              method.account_number,
            // Pour l'affichage du type (traditionnel) ou réseau (crypto)
            method_display: method.is_crypto_pay ? method.network : method.type,
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
        setValue('is_crypto_pay', isCrypto);
      }
    }
  }, [countryId, countries, setValue]);

  const onSubmit = async (data) => {
    try {
      // Construire le payload selon le type
      const payload = {
        ...data,
        // Pour les cryptos, on nettoie les champs traditionnels
        ...(data.is_crypto_pay
          ? {
              type: null,
              phone_number: null,
              account_number: null,
            }
          : {
              network: null,
              crypto_address: null,
            }),
      };

      if (editingMethod) {
        await api.patch(`/payment-type/${editingMethod.id}`, payload);
      } else {
        await api.post('/payment-type/', payload);
      }

      // Recharger les données
      const methodsRes = await api.get('/payment-type/');
      const countryMap = countries.reduce((acc, country) => {
        acc[country.id] = country;
        return acc;
      }, {});

      setMethods(
        methodsRes.data.map((method) => ({
          ...method,
          country_name: countryMap[method.country_id]?.name || 'Inconnu',
          contact: method.crypto_address
            ? 'Crypto'
            : method.phone_number
            ? 'Téléphone'
            : 'Compte bancaire',
          contact_value:
            method.crypto_address ||
            method.phone_number ||
            method.account_number,
          method_display: method.is_crypto_pay ? method.network : method.type,
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
      await confirm({
        description: 'Êtes-vous sûr de vouloir supprimer cette méthode ?',
      });
      await api.delete(`/payment-type/${id}`);
      setMethods(methods.filter((method) => method.id !== id));
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Erreur lors de la suppression');
        console.error(err);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMethod(null);
    reset({
      is_crypto_pay: false,
      type: '',
      network: '',
      crypto_address: '',
      owner_full_name: '',
      phone_number: '',
      account_number: '',
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
        return (
          <Box display="flex" alignItems="center" gap={1}>
            {params.row.is_crypto_pay ? (
              <>
                <Chip
                  label={params.row.network}
                  color="secondary"
                  size="small"
                />
                <Typography variant="body2">(Crypto)</Typography>
              </>
            ) : (
              <Typography variant="body2">{params.row.type}</Typography>
            )}
          </Box>
        );
      },
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
          icon={
            params.value === 'Crypto' ? (
              <CurrencyBitcoin />
            ) : params.value === 'Téléphone' ? (
              <Phone />
            ) : (
              <AccountBalance />
            )
          }
          label={params.value}
          color={
            params.value === 'Crypto'
              ? 'success'
              : params.value === 'Téléphone'
              ? 'primary'
              : 'secondary'
          }
        />
      ),
    },
    {
      field: 'contact_value',
      headerName: 'Détails',
      flex: 1.5,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: params.row.is_crypto_pay ? '0.8rem' : 'inherit',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {params.value}
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
      field: 'actions',
      type: 'actions',
      width: 100,
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
            ? 'Modifier la méthode de paiement'
            : 'Nouvelle méthode de paiement'}
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
                    <InputLabel>Pays associé</InputLabel>
                    <Select
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

              {/* Nom complet du propriétaire (commun) */}
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
                    required
                  />
                )}
              />

              {isCryptoPay && (
                <>
                  <Controller
                    name="network"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormControl fullWidth error={!!fieldState.error}>
                        <InputLabel>Réseau blockchain</InputLabel>
                        <Select
                          label="Réseau blockchain"
                          value={field.value || ''}
                          onChange={field.onChange}
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
                    )}
                  />

                  <Controller
                    name="crypto_address"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Adresse crypto"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        fullWidth
                        required
                        placeholder="Ex: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                      />
                    )}
                  />
                </>
              )}

              {!isCryptoPay && (
                // Champs pour les méthodes traditionnelles
                <>
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
                        required
                        placeholder="Ex: Mobile Money, Virement Bancaire..."
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
                </>
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

export default PaymentMethods;
