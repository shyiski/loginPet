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
  Title,
  Avatar,
  TextInput,
  SegmentedControl
} from '@mantine/core';
import {
  IconRefresh,
  IconShieldCheck,
  IconShieldOff,
  IconUsers,
  IconSearch,
  IconGenderMale,
  IconGenderFemale,
  IconDatabase
} from '@tabler/icons-react';
import { api } from '../api.js';

export function UsersTable({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL'); // 'ALL', 'M', 'F'

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAllUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());

    const matchesGender =
      genderFilter === 'ALL' ||
      (genderFilter === 'M' && u.gender === 'M') ||
      (genderFilter === 'F' && u.gender === 'F');

    return matchesSearch && matchesGender;
  });

  const totalM = users.filter((u) => u.gender === 'M').length;
  const totalF = users.filter((u) => u.gender === 'F').length;
  const total2FA = users.filter((u) => u.two_factor_enabled === 1 || u.two_factor_enabled === true).length;

  return (
    <Stack gap="lg" style={{ maxWidth: 960, width: '100%', margin: '0 auto' }}>
      {/* Top Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm">
        <Paper p="md" radius="md" withBorder className="glass-card">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Users</Text>
              <Title order={3} className="heading-font" mt={4}>{users.length}</Title>
            </div>
            <IconUsers size={26} color="#6366f1" />
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder className="glass-card">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Male (M)</Text>
              <Title order={3} className="heading-font" mt={4} c="blue">{totalM}</Title>
            </div>
            <IconGenderMale size={26} color="#60a5fa" />
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder className="glass-card">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Female (F)</Text>
              <Title order={3} className="heading-font" mt={4} c="pink">{totalF}</Title>
            </div>
            <IconGenderFemale size={26} color="#f472b6" />
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder className="glass-card">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">2FA Protected</Text>
              <Title order={3} className="heading-font" mt={4} c="teal">{total2FA}</Title>
            </div>
            <IconShieldCheck size={26} color="#14b8a6" />
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Main Users Table Card */}
      <Card className="glass-card" radius="lg" p="lg" withBorder>
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <div>
            <Group gap="xs">
              <Title order={3} className="heading-font">
                System Users
              </Title>
              <Badge color="teal" variant="light" size="sm" leftSection={<IconDatabase size={12} />}>
                MongoDB Atlas
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              List of registered users with nicknames, emails, and genders
            </Text>
          </div>

          <Button
            variant="default"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={fetchUsers}
            loading={loading}
          >
            Refresh
          </Button>
        </Group>

        {/* Filter Controls */}
        <Group justify="space-between" mb="md" wrap="wrap">
          <TextInput
            placeholder="Search by name or email..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="xs"
            radius="md"
            style={{ flex: 1, minWidth: 200 }}
          />

          <SegmentedControl
            size="xs"
            radius="md"
            value={genderFilter}
            onChange={setGenderFilter}
            data={[
              { label: 'All', value: 'ALL' },
              { label: 'Male (M)', value: 'M' },
              { label: 'Female (F)', value: 'F' }
            ]}
          />
        </Group>

        {loading && users.length === 0 ? (
          <Group justify="center" py="xl">
            <Loader size="md" color="indigo" />
          </Group>
        ) : filteredUsers.length === 0 ? (
          <Stack align="center" py="xl">
            <Text size="sm" c="dimmed">
              No users found
            </Text>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Gender</Table.Th>
                  <Table.Th>2FA Security</Table.Th>
                  <Table.Th>Registration Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id || currentUser?._id === u._id;
                  const is2FA = u.two_factor_enabled === 1 || u.two_factor_enabled === true;

                  return (
                    <Table.Tr key={u.id || u._id} style={isCurrent ? { background: 'rgba(99, 102, 241, 0.08)' } : undefined}>
                      {/* Avatar + Nickname */}
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar
                            src={u.avatarUrl || u.avatar_url}
                            size={36}
                            radius="xl"
                            color={u.gender === 'F' ? 'pink' : 'indigo'}
                            variant="gradient"
                            gradient={
                              u.gender === 'F'
                                ? { from: 'pink', to: 'violet' }
                                : { from: 'indigo', to: 'blue' }
                            }
                          >
                            {(u.username || u.email || 'U')[0].toUpperCase()}
                          </Avatar>
                          <div>
                            <Group gap={6} align="center">
                              <Text size="sm" fw={600}>
                                {u.username}
                              </Text>
                              {isCurrent && (
                                <Badge size="xs" color="indigo" variant="filled">
                                  You
                                </Badge>
                              )}
                            </Group>
                            <Text size="11px" c="dimmed" ff="monospace">
                              ID: {String(u.id || u._id).slice(-6)}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Email */}
                      <Table.Td>
                        <Text size="sm">{u.email}</Text>
                      </Table.Td>

                      {/* Gender */}
                      <Table.Td>
                        {u.gender === 'M' ? (
                          <Badge color="blue" variant="light" size="sm" leftSection={<IconGenderMale size={14} />}>
                            Male (M)
                          </Badge>
                        ) : u.gender === 'F' ? (
                          <Badge color="pink" variant="light" size="sm" leftSection={<IconGenderFemale size={14} />}>
                            Female (F)
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light" size="sm">
                            Not specified
                          </Badge>
                        )}
                      </Table.Td>

                      {/* 2FA */}
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="light"
                          color={is2FA ? 'teal' : 'gray'}
                          leftSection={is2FA ? <IconShieldCheck size={14} /> : <IconShieldOff size={14} />}
                        >
                          {is2FA ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </Table.Td>

                      {/* Date */}
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('en-US', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '—'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
