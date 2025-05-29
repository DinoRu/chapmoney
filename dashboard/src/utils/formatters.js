import Chip from '@mui/material/Chip';

export const formatAmount = (amount, currency) => {
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

export const StatusChip = ({ status }) => {
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
