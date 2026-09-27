import React, { useState, useEffect } from 'react';
import {
  Modal,
  Title,
  Text,
  PinInput,
  Button,
  Stack,
  Group,
  Alert,
  ThemeIcon,
  Image,
  Paper,
  CopyButton,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Loader
} from '@mantine/core';
import {
  IconShieldCheck,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconDownload,
  IconQrcode,
  IconKey
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api.js';

export function TwoFactorSetupModal({ opened, onClose, onSetupSuccess }) {
  const [step, setStep] = useState(1); // 1: QR & Code, 2: Backup Codes
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (opened) {
      setStep(1);
      setVerifyCode('');
      setBackupCodes([]);
      setError(null);
      loadSetupData();
    }
  }, [opened]);

  const loadSetupData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.setup2FA();
      setSetupData(data);
    } catch (err) {
      setError(err.message || 'Failed to initialize 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code from the app');
      return;
    }

    setConfirmLoading(true);
    setError(null);
    try {
      const result = await api.confirm2FA(verifyCode.trim());
      setBackupCodes(result.backupCodes || []);
      setStep(2);

      notifications.show({
        title: '2FA Successfully Activated!',
        message: 'Make sure to save your recovery backup codes',
        color: 'teal'
      });
      onSetupSuccess?.();
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please check your device clock.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const textContent = `LoginPet — Two-Factor Authentication Backup Codes\nDate: ${new Date().toLocaleString()}\n\nEach code can only be used once:\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nStore these codes in a secure location!`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loginpet-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size={28} color="teal" variant="light" radius="md">
            <IconShieldCheck size={18} />
          </ThemeIcon>
          <Text fw={700} className="heading-font">
            {step === 1 ? 'Connect Authenticator' : 'Save Backup Codes'}
          </Text>
        </Group>
      }
      centered
      size={step === 1 ? 'md' : 'lg'}
    >
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Notice" color="red" variant="light" mb="md" radius="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack align="center" py="xl">
          <Loader size="md" color="indigo" />
          <Text size="sm" c="dimmed">Generating security keys...</Text>
        </Stack>
      ) : step === 1 ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            1. Open <strong>Google Authenticator</strong>, <strong>Apple Passwords</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your smartphone.
          </Text>
          <Text size="sm" c="dimmed">
            2. Scan this QR code with your app:
          </Text>

          {setupData?.qrCodeDataUrl && (
            <Group justify="center">
              <Paper p="xs" radius="md" style={{ background: '#ffffff', display: 'inline-block' }}>
                <Image
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  w={180}
                  h={180}
                  fit="contain"
                />
              </Paper>
            </Group>
          )}

          <Paper p="xs" radius="md" withBorder style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">Secret key (for manual entry):</Text>
                <Text size="sm" ff="monospace" fw={600} style={{ letterSpacing: '1px' }}>
                  {setupData?.secret}
                </Text>
              </div>
              <CopyButton value={setupData?.secret || ''} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy Key'}>
                    <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Paper>

          <Text size="sm" c="dimmed" mt="xs">
            3. Enter the 6-digit code to confirm:
          </Text>

          <form onSubmit={handleConfirm}>
            <Stack gap="md" align="center">
              <PinInput
                size="lg"
                length={6}
                type="number"
                placeholder="○"
                value={verifyCode}
                onChange={setVerifyCode}
                disabled={confirmLoading}
                autoFocus
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                color="teal"
                radius="md"
                loading={confirmLoading}
                leftSection={<IconShieldCheck size={18} />}
              >
                Activate 2FA
              </Button>
            </Stack>
          </form>
        </Stack>
      ) : (
        <Stack gap="md">
          <Alert color="teal" variant="light" radius="md" icon={<IconShieldCheck size={18} />}>
            Two-factor authentication successfully configured in MongoDB!
          </Alert>

          <Text size="sm">
            If you lose access to your Authenticator app, you can sign in using these backup codes.
            <strong> Save them right now!</strong> Each code can only be used once.
          </Text>

          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
            {backupCodes.map((code, idx) => (
              <div key={idx} className="backup-code-chip">
                {code}
              </div>
            ))}
          </SimpleGrid>

          <Group justify="space-between" mt="md">
            <Group gap="xs">
              <CopyButton value={backupCodes.join('\n')} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    onClick={copy}
                  >
                    {copied ? 'Copied!' : 'Copy All'}
                  </Button>
                )}
              </CopyButton>

              <Button
                variant="default"
                size="sm"
                leftSection={<IconDownload size={16} />}
                onClick={downloadBackupCodes}
              >
                Download .txt
              </Button>
            </Group>

            <Button color="indigo" onClick={onClose}>
              Done
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
