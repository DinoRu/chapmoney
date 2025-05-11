// components/ReceivingMethods.jsx
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
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
// import config from '../config';
import api from '../api';

// import { v4 as uuidv4 } from 'uuid';

const schema = yup.object().shape({
  type: yup.string().required('Le type est obligatoire'),
  country_id: yup.string().required('Le pays est obligatoire'),
});

const ReceivingMethods = () => {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
  });

  const fetchData = async () => {
    try {
      const [methodsRes, countriesRes] = await Promise.all([
        api.get('/receiving-type/'),
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
        type: data.type,
        country_id: data.country_id,
      };

      if (editingMethod) {
        await api.patch(`/receiving-type/update/${editingMethod.id}`, payload);
      } else {
        await api.post('/receiving-type/type', payload);
      }

      await fetchData();
      setOpenDialog(false);
      reset();
    } catch (error) {
      console.error('Error saving method:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/receiving-type/${id}`);

      await fetchData();
    } catch (error) {
      console.error('Error deleting method:', error);
    }
  };

  const columns = [
    {
      field: 'type',
      headerName: 'Type de réception',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
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
        <Typography variant="h4">Méthodes de réception</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
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
              <Controller
                name="type"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Type de réception"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />

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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenDialog(false);
                reset();
                setEditingMethod(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="contained">
              {editingMethod ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ReceivingMethods;
