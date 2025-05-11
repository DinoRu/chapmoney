import { useEffect, useState } from 'react';
import { Snackbar, Alert, Typography, Chip, Box } from '@mui/material';

const statusColors = {
  'En attente': 'warning',
  'Dépôt confirmé': 'info',
  Effectuée: 'success',
  Expirée: 'error',
  Annulée: 'error',
};

const NotificationHandler = () => {
  const [notification, setNotification] = useState(null);
  const [open, setOpen] = useState(false);
  const [notificationType, setNotificationType] = useState('');

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost/api/v1/transactions/ws/transactions`,
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'NEW_TRANSACTION') {
        setNotificationType('new');
        setNotification(data.data);
        setOpen(true);
      }

      if (data.type === 'STATUS_CHANGE') {
        setNotificationType('status');
        setNotification(data.data);
        setOpen(true);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert severity="info" sx={{ width: '100%' }} icon={false}>
        {notificationType === 'new' ? (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Nouvelle transaction! 🚀
            </Typography>
            <Typography variant="body2">
              Référence: {notification?.reference}
            </Typography>
            <Typography variant="body2">
              Montant: {notification?.amount} {notification?.currency}
            </Typography>
            <Chip
              label={notification?.status}
              color={statusColors[notification?.status]}
              size="small"
              sx={{ mt: 1 }}
            />
          </>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Mise à jour de statut 🚨
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={notification?.old_status}
                color={statusColors[notification?.old_status]}
                variant="outlined"
                size="small"
              />
              <Typography variant="body2">→</Typography>
              <Chip
                label={notification?.new_status}
                color={statusColors[notification?.new_status]}
                size="small"
              />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Référence: {notification?.reference}
            </Typography>
          </>
        )}
      </Alert>
    </Snackbar>
  );
};

export default NotificationHandler;
