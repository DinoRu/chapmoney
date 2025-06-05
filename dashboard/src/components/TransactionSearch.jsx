import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  Chip,
  Stack,
  Button,
  Divider,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Search, FilterList, Clear, Check, History } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format, subDays } from 'date-fns';
import api from '../api';

const statusOptions = [
  'En cours',
  'Éffectuée',
  'Annulée',
  'En attente',
  'Échouée',
];

const TransactionSearch = ({ onSearchResults }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusFilter, setStatusFilter] = useState([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const toggleStatusFilter = (status) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleSearch = async () => {
    if (!searchQuery && statusFilter.length === 0 && !startDate && !endDate) {
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter.length > 0)
        params.append('status', statusFilter.join(','));
      if (startDate)
        params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));

      const { data } = await api.get(
        `/transactions/search?${params.toString()}`,
      );
      onSearchResults(data);

      if (searchQuery && !searchHistory.includes(searchQuery)) {
        setSearchHistory((prev) => [searchQuery, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setStartDate(subDays(new Date(), 7));
    setEndDate(new Date());
    onSearchResults(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Stack spacing={2}>
        {/* Barre de recherche principale */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  onClick={() => setSearchQuery('')}
                  size="small"
                  edge="end"
                >
                  <Clear fontSize="small" />
                </IconButton>
              ),
            }}
          />

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={handleFilterClick}
            size="small"
          >
            Filtres
          </Button>

          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isSearching}
            size="small"
            startIcon={
              isSearching ? <CircularProgress size={16} /> : <Search />
            }
          >
            Rechercher
          </Button>
        </Stack>

        {/* Filtres actifs */}
        {(statusFilter.length > 0 || startDate || endDate) && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Filtres actifs:
            </Typography>
            {statusFilter.map((status) => (
              <Chip
                key={status}
                label={status}
                size="small"
                onDelete={() => toggleStatusFilter(status)}
              />
            ))}
            {startDate && (
              <Chip
                label={`À partir du ${format(startDate, 'dd/MM/yyyy')}`}
                size="small"
                onDelete={() => setStartDate(null)}
              />
            )}
            {endDate && (
              <Chip
                label={`Jusqu'au ${format(endDate, 'dd/MM/yyyy')}`}
                size="small"
                onDelete={() => setEndDate(null)}
              />
            )}
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={handleClear}
              sx={{ ml: 'auto' }}
            >
              Tout effacer
            </Button>
          </Stack>
        )}

        {/* Historique des recherches */}
        {searchHistory.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <History fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Recherches récentes:
            </Typography>
            {searchHistory.map((term) => (
              <Chip
                key={term}
                label={term}
                size="small"
                onClick={() => {
                  setSearchQuery(term);
                  handleSearch();
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setSearchHistory((prev) => prev.filter((t) => t !== term));
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {/* Menu des filtres */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: {
            width: 320,
            p: 2,
            borderRadius: 2,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          Filtres avancés
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Statut
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          {statusOptions.map((status) => (
            <Chip
              key={status}
              label={status}
              clickable
              size="small"
              color={statusFilter.includes(status) ? 'primary' : 'default'}
              onClick={() => toggleStatusFilter(status)}
              variant={statusFilter.includes(status) ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        <Typography variant="subtitle2" gutterBottom>
          Période
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <DatePicker
            label="Date de début"
            value={startDate}
            onChange={setStartDate}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
              },
            }}
          />
          <DatePicker
            label="Date de fin"
            value={endDate}
            onChange={setEndDate}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
              },
            }}
          />
        </Stack>

        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            handleSearch();
            handleFilterClose();
          }}
          startIcon={<Check />}
          size="small"
        >
          Appliquer les filtres
        </Button>
      </Menu>
    </Paper>
  );
};

export default TransactionSearch;
