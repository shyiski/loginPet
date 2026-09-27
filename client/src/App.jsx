import React, { useState, useEffect } from 'react';
import {
  Container,
  Group,
  Title,
  Text,
  Button,
  ThemeIcon,
  Stack,
  Badge,
  Loader,
  Menu,
  Avatar,
  UnstyledButton,
  Divider
} from '@mantine/core';
import {
  IconShield,
  IconUser,
  IconActivity,
  IconLogout,
  IconSettings,
  IconUsers,
  IconShieldLock,
  IconChevronDown,
  IconGenderMale,
  IconGenderFemale,
  IconRocket
} from '@tabler/icons-react';
import { api } from './api.js';
import { AuthCard } from './components/AuthCard.jsx';
import { TwoFactorOnboarding } from './components/TwoFactorOnboarding.jsx';
import { ProfileSetup } from './components/ProfileSetup.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { UsersTable } from './components/UsersTable.jsx';
import { AuditTable } from './components/AuditTable.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState(null);
  // 'auth', 'setup-2fa', 'profile-setup', 'users-table', 'dashboard', 'logs'
  const [currentView, setCurrentView] = useState('auth');

  const checkAuth = async () => {
    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
        // If user hasn't set up profile, prompt to complete profile
        if (!res.user.profile_completed && !res.user.gender) {
          setCurrentView('profile-setup');
        } else {
          setCurrentView('users-table');
        }
      }
    } catch {
      setCurrentUser(null);
      setCurrentView('auth');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const health = await api.getHealth();
      setDbStatus(health);
    } catch (e) {
      console.error('Health check failed:', e);
    }
  };

  useEffect(() => {
    fetchHealth();
    checkAuth();
  }, []);

  // Standard login callback
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (!user.profile_completed && !user.gender) {
      setCurrentView('profile-setup');
    } else {
      setCurrentView('users-table');
    }
    fetchHealth();
  };

  // Registration callback (new user -> Step 1: 2FA Onboarding)
  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('setup-2fa');
    fetchHealth();
  };

  // After 2FA step is done or skipped -> Step 2: Profile Settings (Name & Gender)
  const handle2FAOnboardingComplete = () => {
    setCurrentView('profile-setup');
    checkAuth();
  };

  // After Profile Settings are saved -> Redirect to Users Table page!
  const handleProfileComplete = (updatedUser) => {
    setCurrentUser(updatedUser);
    setCurrentView('users-table');
    fetchHealth();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setCurrentUser(null);
    setCurrentView('auth');
  };

  const userAvatarSrc = currentUser?.avatarUrl || currentUser?.avatar_url;
  const is2FA = currentUser?.two_factor_enabled === 1 || currentUser?.two_factor_enabled === true;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Container size="lg" py="sm">
          <Group justify="space-between">
            {/* Brand Logo */}
            <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => setCurrentView(currentUser ? 'users-table' : 'auth')}>
              <ThemeIcon size={38} radius="md" color="indigo" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 45 }}>
                <IconShield size={22} />
              </ThemeIcon>
              <div>
                <Title order={4} className="heading-font" style={{ letterSpacing: '-0.3px', margin: 0 }}>
                  LoginPet
                </Title>
                <Text size="11px" c="dimmed" style={{ margin: 0, lineHeight: 1 }}>
                  2FA & MongoDB Atlas
                </Text>
              </div>
            </Group>

            <Group gap="md">
              {/* DB Status Badge */}
              <div className="db-status-pill">
                <span className="pulse-dot"></span>
                <span>{dbStatus?.database || 'MongoDB Atlas'}</span>
              </div>

              {/* Navigation links if logged in */}
              {currentUser && (
                <Group gap="xs" visibleFrom="sm">
                  <Button
                    variant={currentView === 'users-table' ? 'light' : 'subtle'}
                    color="indigo"
                    size="xs"
                    radius="md"
                    leftSection={<IconUsers size={14} />}
                    onClick={() => setCurrentView('users-table')}
                  >
                    Users
                  </Button>

                  <Button
                    variant={currentView === 'dashboard' ? 'light' : 'subtle'}
                    color="indigo"
                    size="xs"
                    radius="md"
                    leftSection={<IconShieldLock size={14} />}
                    onClick={() => setCurrentView('dashboard')}
                  >
                    2FA Security
                  </Button>

                  <Button
                    variant={currentView === 'logs' ? 'light' : 'subtle'}
                    color="indigo"
                    size="xs"
                    radius="md"
                    leftSection={<IconActivity size={14} />}
                    onClick={() => setCurrentView('logs')}
                  >
                    Audit
                  </Button>
                </Group>
              )}

              {/* User Avatar Circle with Dropdown Menu in top right corner */}
              {currentUser ? (
                <Menu shadow="lg" width={270} position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
                  <Menu.Target>
                    <UnstyledButton style={{ outline: 'none', cursor: 'pointer' }}>
                      <Group gap={8} align="center">
                        <div style={{ position: 'relative' }}>
                          <Avatar
                            src={userAvatarSrc}
                            size={42}
                            radius="xl"
                            color={currentUser.gender === 'F' ? 'pink' : 'indigo'}
                            variant="gradient"
                            gradient={
                              currentUser.gender === 'F'
                                ? { from: 'pink', to: 'violet' }
                                : { from: 'indigo', to: 'blue' }
                            }
                            style={{
                              border: userAvatarSrc ? '2px solid #4285F4' : '2px solid rgba(99, 102, 241, 0.6)',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                              transition: 'transform 0.2s ease'
                            }}
                          >
                            {(currentUser.username || currentUser.email || 'U').slice(0, 2).toUpperCase()}
                          </Avatar>
                          {/* Active/Google badge indicator */}
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: 11,
                              height: 11,
                              borderRadius: '50%',
                              backgroundColor: userAvatarSrc ? '#4285F4' : '#10b981',
                              border: '2px solid #0f172a'
                            }}
                            title={userAvatarSrc ? 'Google Account' : 'Online'}
                          />
                        </div>
                        <div style={{ textAlign: 'left' }} className="user-nav-meta">
                          <Text size="xs" fw={700} style={{ lineHeight: 1.2 }}>
                            {currentUser.username}
                          </Text>
                          <Text size="10px" c="dimmed" style={{ lineHeight: 1.2 }}>
                            {userAvatarSrc ? 'Google' : (currentUser.gender === 'M' ? 'Male (M)' : currentUser.gender === 'F' ? 'Female (F)' : 'Profile')}
                          </Text>
                        </div>
                        <IconChevronDown size={14} color="#94a3b8" />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown className="glass-card">
                    <div style={{ padding: '10px 12px' }}>
                      <Group gap="xs" mb={6}>
                        <Avatar
                          src={userAvatarSrc}
                          size={36}
                          radius="xl"
                          color={currentUser.gender === 'F' ? 'pink' : 'indigo'}
                        >
                          {(currentUser.username || currentUser.email || 'U').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={700} truncate>
                            {currentUser.username}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {currentUser.email}
                          </Text>
                        </div>
                      </Group>

                      <Group gap={4} mt={6}>
                        {currentUser.gender === 'M' ? (
                          <Badge size="xs" color="blue" variant="light" leftSection={<IconGenderMale size={12} />}>
                            Male (M)
                          </Badge>
                        ) : currentUser.gender === 'F' ? (
                          <Badge size="xs" color="pink" variant="light" leftSection={<IconGenderFemale size={12} />}>
                            Female (F)
                          </Badge>
                        ) : (
                          <Badge size="xs" color="gray" variant="light">
                            Not specified
                          </Badge>
                        )}

                        <Badge size="xs" color={is2FA ? 'teal' : 'gray'} variant="light">
                          {is2FA ? '2FA On' : '2FA Off'}
                        </Badge>
                      </Group>
                    </div>

                    <Menu.Divider />

                    <Menu.Item
                      leftSection={<IconSettings size={16} />}
                      onClick={() => setCurrentView('profile-setup')}
                    >
                      Settings
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconRocket size={16} />}
                      onClick={() => setCurrentView('setup-2fa')}
                    >
                      First-time Onboarding
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconUsers size={16} />}
                      onClick={() => setCurrentView('users-table')}
                    >
                      Users Table
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconShieldLock size={16} />}
                      onClick={() => setCurrentView('dashboard')}
                    >
                      2FA & Security
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconActivity size={16} />}
                      onClick={() => setCurrentView('logs')}
                    >
                      Audit Logs
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={handleLogout}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : null}
            </Group>
          </Group>
        </Container>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '32px 16px' }}>
        <Container size="lg" style={{ width: '100%' }}>
          {authLoading ? (
            <Stack align="center" py="xl">
              <Loader size="lg" color="indigo" />
              <Text size="sm" c="dimmed">Connecting to system...</Text>
            </Stack>
          ) : currentView === 'auth' ? (
            <Stack gap="xl">
              <AuthCard
                onAuthSuccess={handleAuthSuccess}
                onRegisterSuccess={handleRegisterSuccess}
                dbStatus={dbStatus}
              />

              {/* Viewable Audit Logs */}
              <div style={{ textAlign: 'center' }}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconActivity size={14} />}
                  onClick={() => setCurrentView('logs')}
                >
                  View Security Event Audit Logs
                </Button>
              </div>
            </Stack>
          ) : currentView === 'setup-2fa' ? (
            <div className="fade-in">
              <TwoFactorOnboarding
                user={currentUser}
                onComplete={handle2FAOnboardingComplete}
                onSkip={() => setCurrentView(currentUser?.gender ? 'users-table' : 'profile-setup')}
                onCancel={currentUser ? () => setCurrentView('users-table') : undefined}
              />
            </div>
          ) : currentView === 'profile-setup' ? (
            <div className="fade-in">
              <ProfileSetup
                user={currentUser}
                onComplete={handleProfileComplete}
                onCancel={currentUser?.profile_completed ? () => setCurrentView('users-table') : undefined}
              />
            </div>
          ) : currentView === 'users-table' ? (
            <div className="fade-in">
              <UsersTable currentUser={currentUser} />
            </div>
          ) : currentView === 'dashboard' ? (
            <div className="fade-in">
              <Dashboard
                user={currentUser}
                onUserUpdate={checkAuth}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <div className="fade-in">
              <Stack gap="md">
                <Group justify="flex-start">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setCurrentView(currentUser ? 'users-table' : 'auth')}
                  >
                    ← Back
                  </Button>
                </Group>
                <AuditTable />
              </Stack>
            </div>
          )}
        </Container>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px 0', textAlign: 'center' }}>
        <Container size="lg">
          <Text size="xs" c="dimmed">
            LoginPet Auth System • React 19 + Mantine UI 7 • MongoDB Atlas ({dbStatus?.engine || 'Node.js'})
          </Text>
        </Container>
      </footer>
    </div>
  );
}
