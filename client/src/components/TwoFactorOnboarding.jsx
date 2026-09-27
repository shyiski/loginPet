import React, { useState, useEffect } from 'react';
import {
  Card,
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
  Loader,
  Badge
} from '@mantine/core';
import {
  IconShieldCheck,
  IconShieldLock,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconDownload,
  IconArrowRight,
  IconPlayerSkipForward
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api.js';

export function TwoFactorOnboarding({ user, onComplete, onSkip, onCancel }) {
  const [step, setStep] = useState(1); // 1: QR & PinInput, 2: Backup codes
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSetup();
  }, []);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.setup2FA();
      setSetupData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate 2FA credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit code from your Authenticator app');
      return;
    }

    setConfirmLoading(true);
    setError(null);
    try {
      const res = await api.confirm2FA(verifyCode.trim());
      setBackupCodes(res.backupCodes || []);
      setStep(2);

      notifications.show({
        title: '2FA Activated!',
        message: 'Two-factor protection successfully enabled',
        color: 'teal'
      });
    } catch (err) {
      setError(err.message || 'Invalid code. Please check your device clock and try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const textContent = `LoginPet — 2FA Backup Codes\nAccount: ${user?.email}\nDate: ${new Date().toLocaleString()}\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nEach code is single-use. Store in a secure location!`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loginpet-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card fade-in" radius="lg" p="xl" withBorder style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
      <Stack gap="md">
        <Group justify="center">
          <ThemeIcon size={56} radius="xl" color="teal" variant="light">
            <IconShieldLock size={32} />
          </ThemeIcon>
        </Group>

        <div style={{ textAlign: 'center' }}>
          <Badge color="teal" variant="light" size="sm" mb="xs">
            Step 1 of 2: Account Security
          </Badge>
          <Title order={3} className="heading-font">
            {step === 1 ? 'Connect Authenticator' : 'Save Backup Codes'}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {step === 1
              ? 'Protect your account with two-factor verification via Google Authenticator'
              : 'Backup codes allow you to sign in if you lose access to your device'}
          </Text>
        </div>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Notice" color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack align="center" py="xl">
            <Loader size="md" color="teal" />
            <Text size="sm" c="dimmed">Generating security QR code...</Text>
          </Stack>
        ) : step === 1 ? (
          <Stack gap="md">
            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
              Open <strong>Google Authenticator</strong> (or Apple Passwords / Microsoft Authenticator) and scan the QR code:
            </Text>

            {setupData?.qrCodeDataUrl && (
              <Group justify="center">
                <Paper p="xs" radius="md" style={{ background: '#ffffff', display: 'inline-block' }}>
                  <Image
                    src={setupData.qrCodeDataUrl}
                    alt="2FA QR Code"
                    w={170}
                    h={170}
                    fit="contain"
                  />
                </Paper>
              </Group>
            )}

            <Paper p="xs" radius="md" withBorder style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">Manual entry key:</Text>
                  <Text size="sm" ff="monospace" fw={600} style={{ letterSpacing: '1px' }}>
                    {setupData?.secret}
                  </Text>
                </div>
                <CopyButton value={setupData?.secret || ''} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy'}>
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                        {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Paper>

            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }} mt={4}>
              Enter the 6-digit code from the app:
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
                  Verify and Enable 2FA
                </Button>
              </Stack>
            </form>

            <Group justify="center" mt="xs" gap="sm" wrap="wrap">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                rightSection={<IconPlayerSkipForward size={14} />}
                onClick={onSkip}
              >
                Skip and configure later
              </Button>

              {onCancel && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={onCancel}
                >
                  ← Back to Users Table
                </Button>
              )}
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Alert color="teal" variant="light" radius="md" icon={<IconShieldCheck size={18} />}>
              2FA successfully linked to your account in MongoDB Atlas!
            </Alert>

            <Text size="xs" c="dimmed">
              Save these 6 one-time backup codes. You will need them if you lose access to your authenticator app.
            </Text>

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="backup-code-chip">
                  {code}
                </div>
              ))}
            </SimpleGrid>

            <Group justify="space-between" mt="xs">
              <CopyButton value={backupCodes.join('\n')} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    onClick={copy}
                  >
                    {copied ? 'Copied!' : 'Copy All'}
                  </Button>
                )}
              </CopyButton>

              <Button
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={downloadBackupCodes}
              >
                Download .txt
              </Button>
            </Group>

            <Button
              color="indigo"
              fullWidth
              size="md"
              radius="md"
              mt="md"
              rightSection={<IconArrowRight size={18} />}
              onClick={onComplete}
            >
              Proceed to Profile Setup (Name & Gender)
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
