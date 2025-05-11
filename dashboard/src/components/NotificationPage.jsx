// components/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, Box, Chip } from '@mui/material';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import api from '../api';

const NotificationsPage = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data } = await api.get('/transactions/');
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  const columns = [
    {
      field: 'reference',
      headerName: 'Référence',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="500">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Date',
      width: 180,
      renderCell: (params) => {
        try {
          const date = new Date(params.row.timestamp);

          if (isNaN(date.getTime())) {
            return <Typography color="error">Date invalide</Typography>;
          }

          return (
            <Typography variant="body2">
              {format(date, 'dd MMM yyyy HH:mm', { locale: fr })}
            </Typography>
          );
        } catch (error) {
          return <Typography color="error">Format incorrect</Typography>;
        }
      },
    },
    {
      field: 'status',
      headerName: 'Statut',
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'En attente'
              ? 'warning'
              : params.value === 'Effectuée'
              ? 'success'
              : 'error'
          }
        />
      ),
    },
    {
      field: 'sender_amount',
      headerName: 'Montant',
      flex: 1,
      renderCell: (params) => `${params.value} ${params.row.sender_currency}`,
    },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Historique des Transactions
      </Typography>
      <DataGrid
        rows={transactions}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
          },
        }}
      />
    </Box>
  );
};

export default NotificationsPage;
