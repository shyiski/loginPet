import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Alert,
  SegmentedControl,
  Paper,
  Badge,
  Avatar
} from '@mantine/core';
import {
  IconUser,
  IconGenderMale,
  IconGenderFemale,
  IconAlertCircle,
  IconArrowRight,
  IconDatabase,
  IconArrowLeft
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api.js';

export function ProfileSetup({ user, onComplete, onCancel }) {
  const [username, setUsername] = useState(user?.username || user?.email?.split('@')[0] || '');
  const [gender, setGender] = useState(user?.gender || 'M'); // 'M' or 'F'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.updateProfile({
        username: username.trim(),
        gender: gender
      });

      notifications.show({
        title: 'Profile Saved!',
        message: `Welcome, ${res.user.username}! Profile saved in MongoDB Atlas.`,
        color: 'teal'
      });

      onComplete(res.user);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card fade-in" radius="lg" p="xl" withBorder style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <Stack gap="md">
        <Group justify="center">
          <Avatar
            src={user?.avatarUrl || user?.avatar_url}
            size={68}
            radius="xl"
            color={gender === 'F' ? 'pink' : 'indigo'}
            variant="gradient"
            gradient={
              gender === 'F'
                ? { from: 'pink', to: 'violet' }
                : { from: 'indigo', to: 'blue' }
            }
            style={{
              border: (user?.avatarUrl || user?.avatar_url) ? '3px solid #4285F4' : '3px solid rgba(99, 102, 241, 0.6)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}
          >
            {(username || user?.email || 'U')[0]?.toUpperCase()}
          </Avatar>
        </Group>

        <div style={{ textAlign: 'center' }}>
          <Badge color="indigo" variant="light" size="sm" mb="xs">
            {user?.profile_completed ? 'Edit Profile' : 'Step 2 of 2: Profile Setup'}
          </Badge>
          <Title order={3} className="heading-font">
            Profile Setup
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Set your username and gender (saved in MongoDB Atlas)
          </Text>
        </div>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Your Name / Username"
              placeholder="How should we call you"
              description="Will be displayed in your dashboard and audit logs"
              leftSection={<IconUser size={16} />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              radius="md"
              size="md"
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                Select gender:
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Stored in MongoDB Atlas user document (M or F)
              </Text>

              <SegmentedControl
                value={gender}
                onChange={setGender}
                fullWidth
                size="md"
                radius="md"
                color={gender === 'M' ? 'blue' : 'pink'}
                data={[
                  {
                    value: 'M',
                    label: (
                      <Group gap="xs" justify="center" py={4}>
                        <IconGenderMale size={18} color="#60a5fa" />
                        <span>Male (M)</span>
                      </Group>
                    )
                  },
                  {
                    value: 'F',
                    label: (
                      <Group gap="xs" justify="center" py={4}>
                        <IconGenderFemale size={18} color="#f472b6" />
                        <span>Female (F)</span>
                      </Group>
                    )
                  }
                ]}
              />
            </div>

            <Paper p="xs" radius="md" withBorder style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
              <Group gap="xs" justify="space-between">
                <Text size="xs" c="dimmed">
                  Database target:
                </Text>
                <Badge size="xs" color="teal" variant="light" leftSection={<IconDatabase size={10} />}>
                  MongoDB Atlas
                </Badge>
              </Group>
            </Paper>

            <Button
              type="submit"
              fullWidth
              size="md"
              color="indigo"
              radius="md"
              loading={loading}
              rightSection={<IconArrowRight size={18} />}
            >
              Save and View Users Table
            </Button>

            {onCancel && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                fullWidth
                leftSection={<IconArrowLeft size={14} />}
                onClick={onCancel}
              >
                Back to Users Table
              </Button>
            )}
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
