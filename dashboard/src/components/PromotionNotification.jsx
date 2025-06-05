import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  Popper,
  ClickAwayListener,
  MenuList,
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import { Send, Close, Search, PersonAdd } from '@mui/icons-material';
import api from '../api';

const PromotionNotification = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleToggle = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await api.get(`/users/search?q=${query}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleAddUser = (user) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleSend = async () => {
    if (!title || !message) return;

    setIsSending(true);
    try {
      await api.post('/transactions/notify/promotion', {
        title,
        message,
        user_ids: selectedUsers.map((user) => user.id),
      });
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      handleClose();
    } catch (error) {
      console.error('Error sending promotion:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleToggle}
        sx={{
          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
          color: 'white',
          boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
          marginLeft: 2,
          marginRight: 2,
        }}
        startIcon={<Send />}
      >
        Faire une promotion
      </Button>

      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="bottom-end"
        sx={{ zIndex: 1300, width: 450 }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Notification Promotionnelle
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              required
            />

            <Typography variant="subtitle2" gutterBottom>
              Destinataires ({selectedUsers.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {selectedUsers.map((user) => (
                <Chip
                  key={user.id}
                  label={user.full_name}
                  onDelete={() => handleRemoveUser(user.id)}
                  size="small"
                />
              ))}
            </Box>

            <Box sx={{ position: 'relative', mb: 2 }}>
              <TextField
                fullWidth
                label="Rechercher des clients"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1 }} />,
                }}
              />
              {searchResults.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    zIndex: 1,
                    width: '100%',
                    maxHeight: 200,
                    overflow: 'auto',
                    mt: 1,
                  }}
                >
                  <MenuList>
                    {searchResults.map((user) => (
                      <ListItem
                        key={user.id}
                        onClick={() => handleAddUser(user)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar>{user.full_name.charAt(0)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.full_name}
                          secondary={`${user.email} | ${user.phone}`}
                        />
                        <PersonAdd color="action" />
                      </ListItem>
                    ))}
                  </MenuList>
                </Paper>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleClose}
                startIcon={<Close />}
                sx={{ mr: 1 }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                startIcon={
                  isSending ? <CircularProgress size={20} /> : <Send />
                }
                disabled={isSending || !title || !message}
                variant="contained"
                color="primary"
              >
                Envoyer
              </Button>
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};

export default PromotionNotification;
