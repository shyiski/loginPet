import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Badge,
  Text,
  Group,
  Button,
  Stack,
  Loader,
  SimpleGrid,
  Paper,
  Title
} from '@mantine/core';
import {
  IconRefresh,
  IconShieldLock,
  IconUsers,
  IconActivity
} from '@tabler/icons-react';
import { api } from '../api.js';

export function AuditTable() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.getAuditLogs(20),
        api.getStats()
      ]);
      setLogs(logsRes.logs || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getActionBadge = (action) => {
    switch (action) {
      case 'REGISTER':
        return <Badge color="indigo" variant="light">REGISTER</Badge>;
      case 'LOGIN_SUCCESS':
        return <Badge color="green" variant="light">LOGIN OK</Badge>;
      case 'LOGIN_FAILED':
        return <Badge color="red" variant="light">LOGIN FAIL</Badge>;
      case '2FA_SUCCESS':
        return <Badge color="teal" variant="light">2FA OK</Badge>;
      case '2FA_FAILED':
        return <Badge color="orange" variant="light">2FA FAIL</Badge>;
      case '2FA_ENABLED':
        return <Badge color="cyan" variant="light">2FA ON</Badge>;
      case '2FA_DISABLED':
        return <Badge color="gray" variant="light">2FA OFF</Badge>;
      default:
        return <Badge color="gray" variant="light">{action}</Badge>;
    }
  };

  return (
    <Stack gap="md" style={{ maxWidth: 860, width: '100%', margin: '0 auto' }}>
      {/* Stats Summary */}
      {stats && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Paper p="md" radius="md" withBorder className="glass-card">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Users in DB</Text>
                <Title order={3} className="heading-font" mt={4}>{stats.totalUsers}</Title>
              </div>
              <IconUsers size={28} color="#6366f1" />
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder className="glass-card">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">2FA Protected</Text>
                <Title order={3} className="heading-font" mt={4} c="teal">{stats.usersWith2FA}</Title>
              </div>
              <IconShieldLock size={28} color="#14b8a6" />
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder className="glass-card">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Audit Events</Text>
                <Title order={3} className="heading-font" mt={4}>{stats.totalLogs}</Title>
              </div>
              <IconActivity size={28} color="#38bdf8" />
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* Logs Table */}
      <Card className="glass-card" radius="lg" p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="md">Security & Audit Logs</Text>
            <Text size="xs" c="dimmed">Real-time registration, login, and 2FA authentication events</Text>
          </div>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
        </Group>

        {loading && logs.length === 0 ? (
          <Group justify="center" py="xl">
            <Loader size="sm" color="indigo" />
          </Group>
        ) : (
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Timestamp</Table.Th>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Details</Table.Th>
                  <Table.Th>IP Address</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log) => (
                  <Table.Tr key={log.id || log._id}>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(log.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>{getActionBadge(log.action)}</Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={500}>
                        {log.user_email || <span style={{ color: '#64748b' }}>Guest</span>}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{log.details || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" ff="monospace" c="dimmed">
                        {log.ip_address || '127.0.0.1'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
