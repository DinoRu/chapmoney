// TransactionDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Stack,
  Grid,
  Divider,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  WhatsApp,
  Email,
  Paid,
  Person,
  Receipt,
  CurrencyExchange,
  LocalAtm,
  Schedule,
  Phone,
  Language,
  Payment,
} from '@mui/icons-material';
import api from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction de formatage des montants
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

// Composant pour les éléments de détail avec style amélioré
const DetailItem = ({ label, value, icon, highlight }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      mb: 2,
      p: 1,
      backgroundColor: highlight ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
      borderRadius: 1,
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        borderRadius: '50%',
        mr: 2,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight="600"
        sx={{
          color: highlight ? 'error.main' : 'text.primary',
          fontSize: '1.1rem',
        }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
);

const TransactionDetailPage = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  const fetchTransaction = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/${id}`);
      setTransaction(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement de la transaction');
      console.error('Error fetching transaction:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleValidate = async () => {
    if (!transaction) return;

    setUpdating(true);
    try {
      await api.patch(`/transactions/${transaction.id}`, {
        status: 'Éffectuée',
      });
      await fetchTransaction();
    } catch (err) {
      setError('Échec de la validation');
      console.error('Validation failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!transaction) return;

    setUpdating(true);
    try {
      await api.patch(`/transactions/${transaction.id}`, { status: 'Annulée' });
      await fetchTransaction();
    } catch (err) {
      setError("Échec de l'annulation");
      console.error("Échec de l'annulation:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleContactWhatsApp = () => {
    if (!transaction?.recipient_phone) return;
    window.open(`https://wa.me/${transaction.recipient_phone}`, '_blank');
  };

  const handleContactEmail = () => {
    // Implémentez la logique d'envoi d'email ici
    console.log('Envoi email à:', transaction?.sender?.email);
    alert('Fonctionnalité email à implémenter');
  };

  if (loading) {
    return (
      <Container
        maxWidth="md"
        sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error || !transaction) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Transaction introuvable'}
        </Alert>
      </Container>
    );
  }

  // Formater la date
  const formattedDate = transaction.timestamp
    ? format(new Date(transaction.timestamp), 'dd MMMM yyyy à HH:mm', {
        locale: fr,
      })
    : 'Date inconnue';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Retour aux transactions
      </Button>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, position: 'relative' }}>
        {/* Badge de statut */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            px: 2,
            py: 1,
            backgroundColor:
              transaction.status === 'Éffectuée'
                ? '#4caf50'
                : transaction.status === 'Annulée'
                ? '#f44336'
                : '#ff9800',
            color: 'white',
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: 2,
          }}
        >
          {transaction.status.toUpperCase()}
        </Box>

        {/* En-tête */}
        <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 3,
            }}
          >
            <Receipt fontSize="large" color="primary" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="700">
              Transaction {transaction.reference}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Schedule sx={{ mr: 1 }} />
              {formattedDate}
            </Typography>
          </Box>
        </Stack>

        {/* Section Montants */}
        <Grid
          container
          justifyContent="space-between"
          spacing={4}
          sx={{ mb: 4 }}
        >
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 2, height: '100%' }}
            >
              <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
                <LocalAtm
                  sx={{ mr: 1, color: 'primary.main', fontSize: '2rem' }}
                />
                <Typography variant="h5">Montant envoyé</Typography>
              </Stack>

              <Typography
                variant="h3"
                fontWeight="800"
                color="primary"
                sx={{ mb: 1 }}
              >
                {formatAmount(
                  transaction.sender_amount,
                  transaction.sender_currency,
                )}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={transaction.sender_country}
                  variant="outlined"
                  icon={<Language fontSize="small" />}
                />
                <Chip label={transaction.sender_currency} variant="outlined" />
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 2, height: '100%' }}
            >
              <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
                <Paid sx={{ mr: 1, color: 'success.main', fontSize: '2rem' }} />
                <Typography variant="h5">Montant reçu</Typography>
              </Stack>

              <Typography
                variant="h3"
                fontWeight="800"
                color="success.main"
                sx={{ mb: 1 }}
              >
                {formatAmount(
                  transaction.receiver_amount,
                  transaction.receiver_currency,
                )}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={transaction.receiver_country}
                  variant="outlined"
                  icon={<Language fontSize="small" />}
                />
                <Chip
                  label={transaction.receiver_currency}
                  variant="outlined"
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Section détails */}
        <Grid container justifyContent="space-between" spacing={4}>
          {/* Colonne de gauche - Informations clients */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                mb: 3,
                pb: 1,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Person sx={{ mr: 1 }} />
              Informations clients
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Person sx={{ mr: 1 }} />
                Expéditeur
              </Typography>

              <DetailItem
                label="Nom complet"
                value={transaction.sender?.full_name || 'Non spécifié'}
                icon={<Person />}
              />
              <DetailItem
                label="Téléphone"
                value={transaction.sender?.phone || 'Non spécifié'}
                icon={<Phone />}
              />
              <DetailItem
                label="Pays"
                value={transaction.sender_country || 'Non spécifié'}
                icon={<Language />}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Person sx={{ mr: 1 }} />
                Destinataire
              </Typography>
              <DetailItem
                label="Nom bénéficiaire"
                value={transaction.recipient_name || 'Non spécifié'}
                icon={<Person />}
              />
              <DetailItem
                label="Téléphone"
                value={transaction.recipient_phone || 'Non spécifié'}
                icon={<Phone />}
              />
              <DetailItem
                label="Pays"
                value={transaction.receiver_country || 'Non spécifié'}
                icon={<Language />}
              />
              <DetailItem
                label="Type"
                value={transaction.recipient_type || 'Non spécifié'}
                icon={<Person />}
              />
            </Box>
          </Grid>

          {/* Colonne de droite - Détails transaction */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                mb: 3,
                pb: 1,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Receipt sx={{ mr: 1 }} />
              Détails de la transaction
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CurrencyExchange sx={{ mr: 1 }} />
                Conversion
              </Typography>
              <DetailItem
                label="Taux de change"
                value={`1 ${transaction.sender_currency} = ${transaction.conversion_rate} ${transaction.receiver_currency}`}
                icon={<CurrencyExchange />}
              />
              <DetailItem
                label="Frais inclus"
                value={transaction.include_fee ? 'Oui' : 'Non'}
                highlight={!transaction.include_fee}
                icon={<Paid />}
              />
              <DetailItem
                label="Montant des frais"
                value={formatAmount(
                  transaction.fee_amount,
                  transaction.sender_currency,
                )}
                icon={<Paid />}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Payment sx={{ mr: 1 }} />
                Paiement
              </Typography>
              <DetailItem
                label="Méthode de paiement"
                value={transaction.payment_type || 'Non spécifié'}
                icon={<Payment />}
              />
              <DetailItem
                label="Devise d'origine"
                value={transaction.sender_currency || 'Non spécifié'}
                icon={<CurrencyExchange />}
              />
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Section Actions */}
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Actions
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={
                updating ? <CircularProgress size={20} /> : <CheckCircle />
              }
              onClick={handleValidate}
              disabled={updating || transaction.status !== 'En cours'}
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              Valider
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={updating ? <CircularProgress size={20} /> : <Cancel />}
              onClick={handleCancel}
              disabled={updating || transaction.status !== 'En cours'}
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              Annuler
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<WhatsApp />}
              onClick={handleContactWhatsApp}
              disabled={!transaction.recipient_phone}
              sx={{
                py: 1.5,
                fontWeight: 600,
                backgroundColor: '#25D366',
                '&:hover': { backgroundColor: '#128C7E' },
              }}
            >
              WhatsApp
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<Email />}
              onClick={handleContactEmail}
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              Envoyer email
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default TransactionDetailPage;
