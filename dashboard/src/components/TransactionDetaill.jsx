// TransactionSimplePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Stack,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Paid,
  Person,
  Phone,
  WhatsApp,
  Cancel,
  CheckCircle,
} from '@mui/icons-material';
import api from '../api';

const COLORS = {
  primary: '#4361ee',
  success: '#4cc9f0',
  warning: '#f72585',
};

const formatAmount = (amount, currency) =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

export default function TransactionSimplePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const { data } = await api.get(`/transactions/${id}`);
        setTransaction(data);
      } catch {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id]);

  const updateStatus = async (status) => {
    if (!transaction) return;
    setUpdating(true);
    try {
      await api.patch(`/transactions/${id}`, { status });
      setTransaction({ ...transaction, status });
    } catch {
      setError("Échec de l'opération");
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  if (error || !transaction)
    return (
      <Container maxWidth="sm">
        <Button
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Retour
        </Button>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error || 'Transaction introuvable'}
        </Alert>
      </Container>
    );

  const isPending = transaction.status === 'En cours';

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Retour
      </Button>

      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={600}>
            Transaction #{transaction.reference}
          </Typography>

          <Chip
            label={transaction.status}
            sx={{
              backgroundColor:
                transaction.status === 'Éffectuée'
                  ? COLORS.success
                  : transaction.status === 'Annulée'
                  ? COLORS.warning
                  : COLORS.primary,
              color: 'white',
              width: 'fit-content',
            }}
          />

          <Divider />

          <Typography>
            <strong>Montant envoyé:</strong>{' '}
            {formatAmount(
              transaction.sender_amount,
              transaction.sender_currency,
            )}
          </Typography>
          <Typography>
            <strong>Montant reçu:</strong>{' '}
            {formatAmount(
              transaction.receiver_amount,
              transaction.receiver_currency,
            )}
          </Typography>

          <Divider />

          <Typography>
            <Person fontSize="small" /> Expéditeur:{' '}
            {transaction.sender?.full_name}
          </Typography>
          <Typography>
            <Phone fontSize="small" /> Téléphone: {transaction.sender?.phone}
          </Typography>

          <Typography>
            <Person fontSize="small" /> Destinataire:{' '}
            {transaction.recipient_name}
          </Typography>
          <Typography>
            <Phone fontSize="small" /> Téléphone: {transaction.recipient_phone}
          </Typography>

          <Divider />

          <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
            {isPending && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  disabled={updating}
                  onClick={() => updateStatus('Éffectuée')}
                >
                  Valider
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  disabled={updating}
                  onClick={() => updateStatus('Annulée')}
                >
                  Annuler
                </Button>
              </>
            )}

            <Button
              variant="outlined"
              startIcon={<WhatsApp />}
              href={`https://wa.me/${transaction.recipient_phone}`}
              target="_blank"
              disabled={!transaction.recipient_phone}
            >
              WhatsApp
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
