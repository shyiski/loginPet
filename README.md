# LoginPet — Authentication with 2FA (TOTP), MongoDB Atlas & Mantine UI on Node.js

A modern web authentication application with two-factor security (TOTP via Google Authenticator / Apple Passwords / Authy), cloud database integration with **MongoDB Atlas**, and a responsive user interface built on **React 19 & Mantine UI**.

---

## 🚀 Tech Stack

- **Backend (Node.js v24+, Express.js, ESM)**:
  - **MongoDB Atlas & Mongoose**: Cloud NoSQL database with collections `users`, `backup_codes`, `auth_logs`.
  - **Fallback SQLite (`node:sqlite`)**: Local database for offline fallback.
- **Frontend (React 19, Mantine UI 7, Vite 8)**:
  - **@mantine/core & @mantine/hooks**: Form components, PIN input (`PinInput`), cards, modals, notifications.
  - **@mantine/notifications**: Operation toasts.
  - **@tabler/icons-react**: UI icons.
  - **Vite**: Modern frontend bundling into `public/` directory (Express serves the bundle).
- **Two-Factor Authentication (2FA)**:
  - `otplib` (RFC 6238 TOTP algorithm compatible with all authenticator apps).
  - `qrcode` (QR code generation for instant mobile camera scanning).
  - Single-use backup recovery codes (6 codes in `XXXX-XXXX` format).
- **Security**:
  - `bcryptjs` (password and backup code hashing).
  - `jsonwebtoken` (JWT sessions and temporary 2FA token).
  - `cookie-parser` (HttpOnly cookies).

---

## ⚙️ Configuration (`.env.local`)

The `.env.local` file is automatically loaded and kept in `.gitignore`:

```env
PORT=3200
JWT_SECRET=your_jwt_secret_key_here
APP_NAME=LoginPet

# MongoDB Atlas credentials
MONGODB_USER=your_mongodb_user
MONGODB_PASSWORD=your_mongodb_password
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.latvvii.mongodb.net/loginPet?retryWrites=true&w=majority
```

---

## 🛠️ Running the Project

1. **Start both Server and Client simultaneously:**
   ```bash
   npm start
   # or yarn start
   ```

2. **Build frontend bundle for production:**
   ```bash
   npm run build
   ```

3. **Open in browser:**
   - Client dev server: `http://localhost:3500`
   - Express server: `http://localhost:3200`

---

## 🔐 Application Features

1. **Registration & Google Auth**:
   - Register via Email + Password or 1-click Google OAuth simulation.
   - Passwords securely hashed with `bcrypt` and stored in MongoDB Atlas `users` collection.
2. **Two-Factor Onboarding (2FA)**:
   - Guided onboarding wizard with QR code and manual secret key.
   - Verification code check and 6 downloadable recovery codes (`.txt` download and copy).
3. **Profile Setup (Step 2)**:
   - Onboarding step for choosing preferred username and gender (M or F).
4. **Users Table**:
   - Responsive user directory with statistics (Total Users, Male, Female, 2FA protected count).
   - Filter by gender, search by email/username, and view 2FA status badges.
5. **Security & Audit Logs**:
   - Real-time logging of IP addresses, user agents, and security actions (`REGISTER`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `2FA_SUCCESS`, `2FA_FAILED`, `2FA_ENABLED`, `2FA_DISABLED`).
