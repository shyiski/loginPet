import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  PinInput,
  TextInput,
  Button,
  Stack,
  Group,
  Alert,
  ThemeIcon,
  Anchor
} from '@mantine/core';
import {
  IconShieldLock,
  IconAlertCircle,
  IconArrowLeft,
  IconKey,
  IconDeviceMobile
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api.js';

export function TwoFactorVerifyModal({ tempAuthData, onSuccess, onCancel }) {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const codeToVerify = useBackup ? backupCode.trim() : totpCode.trim();
    if (!codeToVerify) {
      setError(useBackup ? 'Please enter your backup code' : 'Please enter the 6-digit code from your app');
      return;
    }

    if (!useBackup && codeToVerify.length !== 6) {
      setError('Authenticator code must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verify2FA({
        tempToken: tempAuthData.tempToken,
        code: codeToVerify,
        isBackupCode: useBackup
      });

      notifications.show({
        title: 'Login Successful!',
        message: result.usedBackupCode
          ? 'Signed in using backup code'
          : 'Two-factor authentication successfully verified',
        color: 'teal'
      });

      onSuccess(result.user);
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card fade-in" radius="md" p="xl" withBorder>
      <Stack gap="md">
        <Group justify="center" mb="xs">
          <ThemeIcon size={56} radius="xl" color="indigo" variant="light">
            {useBackup ? <IconKey size={30} /> : <IconShieldLock size={32} />}
          </ThemeIcon>
        </Group>

        <div style={{ textAlign: 'center' }}>
          <Title order={3} className="heading-font">
            {useBackup ? 'Backup Code Verification' : '2FA Verification'}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Account: <strong style={{ color: '#e2e8f0' }}>{tempAuthData?.email}</strong>
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            {useBackup
              ? 'Enter one of your single-use 8-character backup codes'
              : 'Open Google Authenticator or your password manager and enter the 6-digit code'}
          </Text>
        </div>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap="lg" mt="xs">
            {!useBackup ? (
              <Group justify="center">
                <PinInput
                  size="xl"
                  length={6}
                  type="number"
                  placeholder="○"
                  value={totpCode}
                  onChange={setTotpCode}
                  autoFocus
                  disabled={loading}
                />
              </Group>
            ) : (
              <TextInput
                label="Backup Code"
                placeholder="XXXX-XXXX"
                leftSection={<IconKey size={16} />}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                autoFocus
                disabled={loading}
              />
            )}

            <Button
              type="submit"
              fullWidth
              size="md"
              loading={loading}
              color="indigo"
              radius="md"
              leftSection={!useBackup ? <IconDeviceMobile size={18} /> : <IconKey size={18} />}
            >
              {useBackup ? 'Verify Backup Code' : 'Verify and Sign In'}
            </Button>
          </Stack>
        </form>

        <Group justify="space-between" mt="xs">
          <Anchor
            component="button"
            type="button"
            size="xs"
            c="dimmed"
            onClick={() => {
              setUseBackup(!useBackup);
              setError(null);
            }}
          >
            {useBackup ? '← Use Authenticator app (6 digits)' : 'Lost access to app? Use backup code'}
          </Anchor>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
            onClick={onCancel}
          >
            Back to login
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
