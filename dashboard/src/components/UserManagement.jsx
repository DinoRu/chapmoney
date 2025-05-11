import React, { useState, useEffect } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Chip,
  Container,
  Typography,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Delete, Edit, Refresh } from '@mui/icons-material';

import api from '../api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users/');

      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}`, { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Confirmer la suppression ?')) {
      try {
        await api.delete(`/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const columns = [
    { field: 'full_name', headerName: 'Nom complet', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Téléphone', flex: 1 },
    {
      field: 'role',
      headerName: 'Rôle',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'admin'
              ? 'primary'
              : params.value === 'agent'
              ? 'secondary'
              : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Modifier"
          onClick={() => {
            setEditUser(params.row);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          icon={<Delete color="error" />}
          label="Supprimer"
          onClick={() => handleDelete(params.id)}
        />,
      ],
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="700">
          Gestion des Utilisateurs
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchUsers}
          startIcon={<Refresh />}
        >
          Actualiser
        </Button>
      </Stack>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </div>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Modifier le rôle</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Rôle</InputLabel>
            <Select
              value={editUser?.role || ''}
              onChange={(e) =>
                setEditUser({ ...editUser, role: e.target.value })
              }
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="agent">Agent</MenuItem>
              <MenuItem value="user">Utilisateur</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await handleRoleUpdate(editUser.id, editUser.role);
              setOpenDialog(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
