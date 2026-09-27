import React, { useState } from "react";
import {
  Card,
  Tabs,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Group,
  ThemeIcon,
  Badge,
  Divider,
  Modal,
  Avatar,
  UnstyledButton,
  Paper,
  Box
} from "@mantine/core";
import {
  IconLock,
  IconUser,
  IconMail,
  IconAlertCircle,
  IconUserPlus,
  IconLogin,
  IconShield,
  IconDatabase,
  IconBrandGoogle,
  IconCheck
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "../api.js";
import { TwoFactorVerifyModal } from "./TwoFactorVerifyModal.jsx";

const GOOGLE_AVATAR_PRESETS = [
  { id: '1', label: 'Photo 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { id: '2', label: 'Photo 2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: '3', label: 'Photo 3', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80' },
  { id: '4', label: 'Standard', url: 'https://lh3.googleusercontent.com/a/default-user=s96-c' }
];

// Custom Google Icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function AuthCard({ onAuthSuccess, onRegisterSuccess, dbStatus }) {
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state (email and password only)
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Google Modal state
  const [googleModalOpened, setGoogleModalOpened] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState(GOOGLE_AVATAR_PRESETS[0].url);

  // 2FA pending state
  const [twoFactorData, setTwoFactorData] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setError("Please fill in email (or username) and password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });

      // If user requires 2FA
      if (res.requires2FA) {
        setTwoFactorData(res);
        return;
      }

      notifications.show({
        title: "Login Successful",
        message: `Welcome back, ${res.user.username || res.user.email}!`,
        color: "teal",
      });
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const hasMinLength = regPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(regPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasSpecialChar;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!regEmail.trim() || !regPassword) {
      setError("Email and password are required");
      return;
    }

    if (!hasMinLength) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!hasUppercase) {
      setError("Password must contain at least one uppercase letter (A-Z)");
      return;
    }

    if (!hasSpecialChar) {
      setError("Password must contain at least one special character or symbol (!@#$...)");
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        email: regEmail.trim(),
        password: regPassword,
      });

      notifications.show({
        title: "Account Created!",
        message: "User saved in MongoDB Atlas. Proceeding to 2FA setup...",
        color: "teal",
      });

      // Transition straight into the 2FA & Onboarding flow
      onRegisterSuccess(res.user);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please specify Google account email");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.loginGoogle({
        email: googleEmail.trim(),
        name: googleName.trim() || googleEmail.split('@')[0],
        googleId: 'g_' + Math.random().toString(36).substring(2, 10),
        avatarUrl: googleAvatarUrl
      });

      setGoogleModalOpened(false);

      if (res.isNew) {
        notifications.show({
          title: "Google Registration Successful!",
          message: "Account created in MongoDB Atlas. Setting up 2FA...",
          color: "teal"
        });
        onRegisterSuccess(res.user);
      } else {
        notifications.show({
          title: "Google Sign In",
          message: `Welcome, ${res.user.username}!`,
          color: "teal"
        });
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // If currently in 2FA verification step
  if (twoFactorData) {
    return (
      <TwoFactorVerifyModal
        tempAuthData={twoFactorData}
        onSuccess={(user) => {
          setTwoFactorData(null);
          onAuthSuccess(user);
        }}
        onCancel={() => {
          setTwoFactorData(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <Card
      className="glass-card fade-in"
      radius="lg"
      p="xl"
      withBorder
      style={{ maxWidth: 460, width: "100%", margin: "0 auto" }}
    >
      <Stack gap="md">
        <Group justify="flex-start" align="center">
          <Group gap="xs">
            <ThemeIcon
              size={40}
              radius="md"
              color="indigo"
              variant="gradient"
              gradient={{ from: "indigo", to: "violet", deg: 45 }}
            >
              <IconShield size={22} />
            </ThemeIcon>
            <div>
              <Title
                order={3}
                className="heading-font"
                style={{ letterSpacing: "-0.5px" }}
              >
                LoginPet
              </Title>
              <Text size="xs" c="dimmed">
                Two-Factor Authentication (2FA)
              </Text>
            </div>
          </Group>
        </Group>

        {error && (
          <Alert
            icon={error.toLowerCase().includes('lock') ? <IconLock size={16} /> : <IconAlertCircle size={16} />}
            title={error.toLowerCase().includes('lock') ? "Security Lockout (15 min)" : "Authentication Error"}
            color="red"
            variant="light"
            radius="md"
          >
            {error}
          </Alert>
        )}

        {/* Quick Google Auth Button */}
        <Button
          fullWidth
          variant="default"
          size="md"
          radius="md"
          leftSection={<GoogleIcon />}
          onClick={() => {
            setGoogleEmail("user@gmail.com");
            setGoogleName("Google User");
            setGoogleModalOpened(true);
          }}
        >
          {activeTab === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
        </Button>

        <Divider label="or continue with email and password" labelPosition="center" my="xs" />

        <Tabs
          value={activeTab}
          onChange={(val) => {
            setActiveTab(val);
            setError(null);
          }}
          variant="pills"
          radius="md"
          color="indigo"
        >
          <Tabs.List grow mb="md">
            <Tabs.Tab value="login" leftSection={<IconLogin size={16} />}>
              Sign In
            </Tabs.Tab>
            <Tabs.Tab value="register" leftSection={<IconUserPlus size={16} />}>
              Sign Up
            </Tabs.Tab>
          </Tabs.List>

          {/* Login Tab */}
          <Tabs.Panel value="login">
            <form onSubmit={handleLogin}>
              <Stack gap="md">
                <TextInput
                  label="Email or Username"
                  placeholder="user@example.com"
                  leftSection={<IconMail size={16} />}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  disabled={loading}
                  required
                  radius="md"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  leftSection={<IconLock size={16} />}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                  required
                  radius="md"
                />

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  color="indigo"
                  radius="md"
                  loading={loading}
                  leftSection={<IconLogin size={18} />}
                  mt="xs"
                >
                  Sign In
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {/* Register Tab: Email + Password */}
          <Tabs.Panel value="register">
            <form onSubmit={handleRegister}>
              <Stack gap="md">
                <TextInput
                  label="Email Address"
                  placeholder="user@example.com"
                  type="email"
                  leftSection={<IconMail size={16} />}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={loading}
                  required
                  radius="md"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Min 6 chars, uppercase & special symbol"
                  leftSection={<IconLock size={16} />}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={loading}
                  required
                  radius="md"
                />

                {/* Password Complexity Checklist */}
                {regPassword.length > 0 && (
                  <Paper p="xs" radius="md" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="dimmed">Password requirements:</Text>
                      <Group gap="xs">
                        <Badge
                          size="xs"
                          variant={hasMinLength ? "filled" : "outline"}
                          color={hasMinLength ? "teal" : "gray"}
                          leftSection={hasMinLength ? <IconCheck size={10} stroke={3} /> : null}
                        >
                          6+ characters
                        </Badge>
                        <Badge
                          size="xs"
                          variant={hasUppercase ? "filled" : "outline"}
                          color={hasUppercase ? "teal" : "gray"}
                          leftSection={hasUppercase ? <IconCheck size={10} stroke={3} /> : null}
                        >
                          1 uppercase (A-Z)
                        </Badge>
                        <Badge
                          size="xs"
                          variant={hasSpecialChar ? "filled" : "outline"}
                          color={hasSpecialChar ? "teal" : "gray"}
                          leftSection={hasSpecialChar ? <IconCheck size={10} stroke={3} /> : null}
                        >
                          1 symbol (!@#$...)
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                )}

                <Badge
                  color="teal"
                  variant="light"
                  size="sm"
                  radius="sm"
                  leftSection={<IconDatabase size={12} />}
                >
                  Saved in MongoDB Atlas (bcrypt hashing)
                </Badge>

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  color="teal"
                  radius="md"
                  loading={loading}
                  leftSection={<IconUserPlus size={18} />}
                >
                  Create Account & Setup 2FA
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Google Sign-In Simulation Modal */}
      <Modal
        opened={googleModalOpened}
        onClose={() => setGoogleModalOpened(false)}
        title={
          <Group gap="xs">
            <GoogleIcon />
            <Text fw={600}>Google Authentication</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <form onSubmit={handleGoogleSubmit}>
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              One-click sign in or sign up with your Google account:
            </Text>

            <TextInput
              label="Google Email"
              placeholder="user@gmail.com"
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              required
              autoFocus
            />

            <TextInput
              label="Username"
              placeholder="John Doe"
              value={googleName}
              onChange={(e) => setGoogleName(e.target.value)}
            />

            <div>
              <Text size="xs" fw={600} mb={6}>
                Google Profile Photo (for top-right avatar):
              </Text>
              <Group gap="sm" align="center">
                {GOOGLE_AVATAR_PRESETS.map((preset) => (
                  <UnstyledButton
                    key={preset.id}
                    onClick={() => setGoogleAvatarUrl(preset.url)}
                    style={{
                      borderRadius: '50%',
                      padding: 2,
                      border: googleAvatarUrl === preset.url ? '2px solid #4285F4' : '2px solid transparent',
                      boxShadow: googleAvatarUrl === preset.url ? '0 0 10px rgba(66, 133, 244, 0.6)' : 'none',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <Avatar src={preset.url} size={42} radius="xl" />
                  </UnstyledButton>
                ))}
              </Group>
            </div>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={() => setGoogleModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" loading={loading} leftSection={<GoogleIcon />}>
                Continue with Google
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Card>
  );
}
