// AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Chip,
  Container,
  Typography,
  Stack,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  WhatsApp,
  Email,
  Refresh,
  Cancel,
  // Language,
  Paid,
  Person,
} from '@mui/icons-material';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import api from '../api';

const formatAmount = (amount, currency) => {
  try {
    return (
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(amount)
        .replace(currency, '')
        .trim() + ` ${currency}`
    );
  } catch {
    return `${amount} ${currency}`;
  }
};

const StatusChip = ({ status }) => {
  const statusConfig = {
    'En cours': { bg: '#fff3e0', text: '#ef6c00', icon: '⏳' },
    Éffectuée: { bg: '#e8f5e9', text: '#2e7d32', icon: '✅' },
    // Expirée: { bg: '#ffebee', text: '#d32f2f', icon: '⌛' },
    Annulée: { bg: '#f5f5f5', text: '#d32f2f', icon: '❌' },
  };

  const config = statusConfig[status] || {
    bg: '#f5f5f5',
    text: '#616161',
    icon: '❓',
  };

  return (
    <Chip
      label={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{config.icon}</span>
          <span>{status}</span>
        </div>
      }
      sx={{
        backgroundColor: config.bg,
        color: config.text,
        fontWeight: 600,
        '& .MuiChip-label': { padding: '0 12px' },
      }}
    />
  );
};

const TransactionTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get('/transactions/');
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      field: 'sender',
      headerName: 'Expéditeur',
      flex: 1,
      renderCell: (params) => (
        <Stack>
          <Typography variant="body2" fontWeight="500">
            {params.row.sender?.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tél: {params.row.sender?.phone}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'countries',
      headerName: 'Pays',
      width: 200,
      renderCell: (params) => (
        <Stack>
          <Typography variant="body2">
            {params.row.sender_country} → {params.row.receiver_country}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.sender_currency}/{params.row.receiver_currency}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'amounts',
      headerName: 'Montants',
      width: 180,
      renderCell: (params) => (
        <Stack>
          <Typography variant="body2">
            Envoyé:{' '}
            {formatAmount(params.row.sender_amount, params.row.sender_currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reçu:{' '}
            {formatAmount(
              params.row.receiver_amount,
              params.row.receiver_currency,
            )}
          </Typography>
        </Stack>
      ),
    },

    {
      field: 'status',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'timestamp',
      headerName: 'Date',
      width: 180,
      renderCell: (params) => {
        try {
          const date = new Date(params.row.timestamp);
          return isNaN(date.getTime()) ? (
            <Typography color="error">Date invalide</Typography>
          ) : (
            <Typography variant="body2">
              {format(date, 'dd MMM yyyy HH:mm', { locale: fr })}
            </Typography>
          );
        } catch {
          return <Typography color="error">Format incorrect</Typography>;
        }
      },
      sortComparator: (v1, v2) => new Date(v1) - new Date(v2),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) =>
        [
          params.row.status === 'En cours' && (
            <GridActionsCellItem
              key="validate"
              icon={<CheckCircle color="success" />}
              label="Valider"
              onClick={() => handleValidate(params.row.id)}
              showInMenu
            />
          ),
          <GridActionsCellItem
            key="contact"
            icon={<WhatsApp color="primary" />}
            label="Contacter"
            onClick={() => handleContactClient(params.row)}
            showInMenu
          />,
          params.row.status === 'En cours' && (
            <GridActionsCellItem
              key="cancel"
              icon={<Cancel color="error" />}
              label="Annuler"
              onClick={() => handleCancelTransaction(params.row.id)}
              showInMenu
            />
          ),
        ].filter(Boolean),
    },
  ];

  const TransactionDetailModal = ({ transaction, open, onClose }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Détails de la transaction #{transaction?.reference}
      </DialogTitle>
      <DialogContent>
        {transaction && (
          <Grid container spacing={3} sx={{ pt: 2 }}>
            {/* Section Expéditeur */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Person /> Expéditeur
              </Typography>
              <DetailItem label="Nom: " value={transaction.sender?.full_name} />
              <DetailItem label="Pays" value={transaction.sender_country} />
              <DetailItem label="Devise" value={transaction.sender_currency} />
              <DetailItem
                label="Montant initial"
                value={formatAmount(
                  transaction.sender_amount,
                  transaction.sender_currency,
                )}
              />
            </Grid>

            {/* Section Destinataire */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Person /> Destinataire
              </Typography>
              <DetailItem label="Pays" value={transaction.receiver_country} />
              <DetailItem
                label="Devise"
                value={transaction.receiver_currency}
              />
              <DetailItem
                label="Montant reçu"
                value={formatAmount(
                  transaction.receiver_amount,
                  transaction.receiver_currency,
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Section Frais et Conversion */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Paid /> Frais & Conversion
              </Typography>
              <DetailItem
                label="Frais inclus"
                value={transaction.include_fee ? 'Oui' : 'Non'}
                highlight={!transaction.include_fee}
              />
              <DetailItem
                label="Montant des frais"
                value={formatAmount(
                  transaction.fee_amount,
                  transaction.sender_currency,
                )}
              />
              <DetailItem
                label="Taux de conversion"
                value={`1 ${transaction.sender_currency} = ${transaction.conversion_rate} ${transaction.receiver_currency}`}
              />
            </Grid>

            {/* Section Paiement */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Paid /> Paiement
              </Typography>
              <DetailItem label="Méthode" value={transaction.payment_type} />
              <DetailItem
                label="Bénéficiaire"
                value={transaction.recipient_name}
              />
              <DetailItem
                label="Téléphone"
                value={transaction.recipient_phone}
              />
              <DetailItem label="Type" value={transaction.recipient_type} />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );

  const DetailItem = ({ label, value, highlight }) => (
    <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
      <Typography variant="body2" fontWeight="500" sx={{ minWidth: 120 }}>
        {label}:
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: highlight ? 'error.main' : 'inherit' }}
      >
        {value}
      </Typography>
    </Stack>
  );

  const handleValidate = async (id) => {
    try {
      await api.patch(`/transactions/${id}`, { status: 'Éffectuée' });
      await fetchTransactions();
    } catch (error) {
      console.error('Validation failed:', error.response?.data);
    }
  };

  const handleCancelTransaction = async (id) => {
    try {
      await api.patch(`/transactions/${id}`, { status: 'Annulée' });
      await fetchTransactions();
    } catch (error) {
      console.error("Échec de l'annulation:", error);
    }
  };

  const handleContactClient = (transaction) => {
    setSelectedTransaction({
      ...transaction,
      senderPhone: transaction.recipient_phone,
      senderEmail: 'Non fourni', // Ajoutez cette ligne si l'email n'est pas dans la réponse
    });
    setOpenDialog(true);
  };

  <DataGrid
    rows={transactions}
    columns={columns}
    loading={loading}
    pageSize={10}
    rowsPerPageOptions={[10, 25, 50]}
    disableSelectionOnClick
    initialState={{
      sorting: {
        sortModel: [{ field: 'timestamp', sort: 'desc' }],
      },
    }}
    localeText={{
      noRowsLabel: 'Aucune transaction trouvée',
      footerRowSelected: (count) =>
        `${count} ligne${count > 1 ? 's' : ''} sélectionnée${
          count > 1 ? 's' : ''
        }`,
    }}
    sx={{
      '& .MuiDataGrid-cell[data-field*="amount"], & .MuiDataGrid-cell[data-field*="country"]':
        {
          fontFamily: 'inherit',
          justifyContent: 'flex-start',
          paddingLeft: '20px',
        },
      '& .MuiDataGrid-columnHeader[data-field*="country"]': {
        paddingLeft: '20px !important',
      },
    }}
  />;
  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="700">
          Transactions
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchTransactions}
        >
          Actualiser
        </Button>
      </Stack>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={transactions}
          getRowId={(row) => row.id}
          columns={columns}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell[data-field*="amount"]': {
              fontFamily: 'Monospace',
              justifyContent: 'flex-end',
              paddingRight: '20px !important',
            },
          }}
          localeText={{
            noRowsLabel: 'Aucune transaction trouvée',
            footerRowSelected: (count) =>
              `${count} ligne${count > 1 ? 's' : ''} sélectionnée${
                count > 1 ? 's' : ''
              }`,
          }}
          onRowClick={(params) => {
            setSelectedTransaction(params.row);
            setDetailOpen(true);
          }}
        />
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <ContactDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        transaction={selectedTransaction}
      />
    </Container>
  );
};

const ContactDialog = ({ open, onClose, transaction }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Contacter le client - #{transaction?.reference}</DialogTitle>
    <DialogContent>
      <Stack spacing={3} sx={{ pt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<WhatsApp />}
          href={`https://wa.me/${transaction?.recipient_phone}`}
          target="_blank"
        >
          Envoyer message WhatsApp
        </Button>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<Email />}
          //   href={`mailto:${transaction?.recipien}`}
        >
          Envoyer email
        </Button>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Fermer</Button>
    </DialogActions>
  </Dialog>
);

export default TransactionTable;
