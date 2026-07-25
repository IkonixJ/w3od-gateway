# W3OD Gateway

A decentralized community gateway for Web3 rewards, campaigns, and social engagement. Built with React Native (Expo) and Supabase.

## Features

### Authentication & Onboarding
- Email/password sign-up with invite code
- Email OTP verification
- 4-digit transaction PIN creation
- Device trust verification (OTP on new devices)
- Biometric authentication (Face ID / Fingerprint)
- Login lockout after 5 failed attempts (15-minute cooldown)
- Session inactivity auto-logout (15 minutes)
- Password reset flow

### Wallet
- W3OD Balance tracking (lifetime earned, lifetime redeemed, pending balance)
- Peer-to-peer transfers with PIN verification
- Bank account management
- Redemption requests with processing dates
- Transaction history with filtering (type, status, search)
- Transaction detail view with sender/receiver profiles
- QR code for receiving transfers
- Daily transfer limits and minimums

### KYC (Know Your Customer)
- Document submission (ID, proof of address, selfie)
- Admin review workflow (approve/reject with reason)
- KYC-gated wallet features
- Status tracking and history

### Campaigns
- Active campaign discovery
- Campaign participation with proof submission
- Admin campaign management (create, edit, pause, complete)
- Submission review workflow (approve/reject with feedback)
- Reward crediting (W3OD + XP) upon approval
- Campaign-specific badges

### Community
- 1:1 direct messaging with real-time updates
- Group chat with admin moderation
- Member directory with search
- Community announcements with reactions
- Group creation and management
- Member profiles

### Events
- Event discovery (upcoming, live, completed)
- RSVP and check-in (QR + manual)
- Event photo gallery
- Admin event management
- Attendance rewards

### Leaderboard
- Weekly, monthly, and all-time rankings
- Categories: XP, contributions, earnings, referrers
- Rank badges and progression

### Notifications
- Real-time notification feed
- Per-category filtering
- Read/unread states
- Notification preferences (push, email, marketing, campaign, security)

### Settings & Security
- Profile editing (name, bio, avatar, phone)
- Username change with live availability checking
- Email change (password + OTP verification)
- Password change (current password verification)
- Transaction PIN change (current PIN + OTP)
- Biometric sign-in toggle
- Trusted device management (rename, remove)
- Security center (login history, security events, active sessions)
- Sign out from all devices
- Account deletion with 30-day grace period and wallet freeze
- Account restoration (self-cancel or admin-restore)

### Admin Dashboard
- Analytics overview (user growth, campaign stats, wallet metrics)
- Member management (view, suspend, role assignment)
- KYC review queue
- Campaign review and management
- Redemption processing (approve/reject/pay)
- Badge creation and management
- Support ticket management
- Announcement broadcasting
- Invite code generation
- Audit log viewer

## Tech Stack

- **Frontend:** React Native 0.81 + Expo SDK 54 (Web-first, cross-platform)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Navigation:** Expo Router (tab-based with stack nesting)
- **Styling:** StyleSheet.create with custom design tokens (no NativeWind in components)
- **Animations:** React Native Reanimated 4
- **Icons:** Lucide React Native
- **Fonts:** Orbitron (display), Rajdhani (heading), Inter (body)

## Project Structure

```
app/
  _layout.tsx              # Root layout (Stack)
  +not-found.tsx           # 404 screen
  (auth)/                  # Authentication flow
    welcome.tsx            # Landing page
    sign-up.tsx            # Registration
    sign-in.tsx            # Login
    verify-email.tsx       # OTP verification
    create-pin.tsx         # PIN setup
    device-verify.tsx      # New device OTP
    forgot-password.tsx    # Password reset request
    reset-password.tsx     # Password reset
  (tabs)/                  # Main app (tab navigation)
    index.tsx              # Dashboard
    profile.tsx            # User profile
    campaigns.tsx          # Campaign list
    campaign-detail.tsx    # Campaign details + proof submission
    leaderboard.tsx        # Rankings
    learn.tsx              # Educational content
    messaging.tsx          # DM list
    notifications.tsx      # Notification feed
    kyc.tsx                # KYC submission
    admin.tsx              # Admin dashboard
    admin-*.tsx            # Admin sub-screens
    wallet/                # Wallet module
    community/             # Community module
    events/                # Events module
    settings/              # Settings module
    support/               # Support module
components/
  brand/                   # Logo + Splash screen
  dashboard/               # Dashboard-specific components
  ui/                      # Shared UI components (GlassCard, NeonButton, etc.)
  wallet/                  # Wallet-specific components
context/
  AuthProvider.tsx         # Auth state + actions
design/
  tokens.ts                # Color palette, typography, spacing
  responsive.ts            # Screen size utilities
lib/
  supabase.ts              # Supabase client singleton
  auth-service.ts          # Auth RPC wrappers
  security.ts              # PIN hashing (SHA-256 with native fallback)
  device.ts               # Device fingerprinting
  wallet-service.ts        # Wallet operations
  campaign-service.ts     # Campaign operations
  community-service.ts     # Community operations
  messaging-service.ts    # Real-time messaging
  event-service.ts         # Event operations
  notification-service.ts  # Notification operations
  kyc-service.ts           # KYC operations
  admin-service.ts         # Admin operations
  support-service.ts       # Support ticket operations
  settings-service.ts      # Settings operations
  rbac.tsx                 # Role-based access control
  validation.ts            # Input validators
  file-utils.ts            # Cross-platform file picking
  format.ts                # Shared date/time formatting
  xp-service.tsx           # XP/level calculations + animated counting
types/
  index.ts                 # Canonical type re-exports
  campaigns.ts             # Campaign types
  wallet.ts                # Wallet types
  kyc.ts                   # KYC types
  community.ts            # Community types
  events.ts               # Event types
  notifications.ts        # Notification types
  support.ts              # Support types
supabase/
  migrations/             # SQL migrations
  functions/              # Edge functions (send-otp, reset-password)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (installed via npx)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The dev server starts automatically. Open the provided URL in your browser.

### Build
```bash
npm run build:web    # Web production build
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

## Database

The app uses Supabase (PostgreSQL) with:
- **Row Level Security (RLS)** on every table — users can only access their own data
- **SECURITY DEFINER RPC functions** for operations that bypass RLS (PIN management, admin actions, account deletion)
- **Guard triggers** preventing direct self-update of sensitive columns (pin_hash, login_attempts, role)
- **Real-time subscriptions** for messaging and notifications

### Key Migrations
1. `create_profiles_and_rbac` — User profiles, roles, invite codes
2. `auth_onboarding_schema` — Trusted devices, login attempts, OTP helper functions
3. `wallet_module_schema` — Wallets, transactions, redemptions, bank accounts
4. `kyc_profile_schema` — KYC submissions, document storage
5. `campaigns_rewards_xp_badges_leaderboard_schema` — Campaigns, badges, XP, leaderboard
6. `community_messaging_schema` — Conversations, group chats, messages, reactions
7. `events_notifications_support_schema` — Events, RSVPs, notifications, support tickets
8. `settings_security_account_schema` — Notification preferences, login history, security events, account deletion
9. `rls_security_hardening` — Additional RLS DELETE policies

## Security

- **PIN Hashing:** SHA-256 with salt, with pure-JS fallback for React Native native runtime
- **Device Fingerprinting:** Platform + screen + timezone factors (djb2 hash)
- **Login Lockout:** 5 failed attempts triggers 15-minute lockout
- **PIN Lockout:** 3 failed attempts triggers lockout (admin reset required)
- **Account Deletion:** 30-day grace period with wallet freeze and username reservation
- **Admin Audit Trail:** All admin actions logged to `audit_logs` table
- **Session Management:** Inactivity timeout, device trust, OTP verification

## Environment Variables

Configured in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

## Known Limitations

1. **File upload is web-only** — Native file picking requires `expo-document-picker` (not installed). On native, users see a message to use a browser.
2. **Clipboard is web-only** — Native clipboard requires `expo-clipboard` (not installed). On native, copy is a no-op.
3. **Biometric authentication is web-only** — On web, biometrics report as unavailable. On native, `expo-local-authentication` is used via dynamic import.
4. **Push notifications are not implemented** — The notification preferences exist but actual push delivery requires FCM/APNs setup.
5. **Account deletion purge is manual** — The 30-day grace period is tracked, but permanent data purge requires a scheduled job or admin action.
6. **No offline support** — All data requires a network connection.
7. **QR code scanning is not implemented** — QR generation works, but scanning requires a camera library.

## Remaining TODOs

- [ ] Install `expo-document-picker` for native file upload
- [ ] Install `expo-clipboard` for native clipboard support
- [ ] Install `expo-notifications` for push notification delivery
- [ ] Add QR code scanning with `expo-camera` for event check-in and wallet transfers
- [ ] Add proper OTP input step for email change and PIN change flows
- [ ] Implement scheduled job for permanent account deletion after 30 days
- [ ] Add pull-to-refresh to remaining screens (community, events, admin)
- [ ] Add proper error boundaries for crash recovery
- [ ] Add analytics tracking (user engagement, screen views)
- [ ] Add deep linking for notifications and shared content
- [ ] Add end-to-end encryption for direct messages
- [ ] Add rate limiting for messaging and support ticket creation
- [ ] Add image compression for uploads (avatar, proof, event photos)
- [ ] Add proper loading skeletons (currently uses spiners)
- [ ] Add unit and integration tests

## Version 2.0 Recommendations

1. **Offline-first architecture** — Use SQLite/WatermelonDB for local caching with sync-on-reconnect
2. **End-to-end encrypted messaging** — Implement Signal Protocol for DMs
3. **Push notifications** — FCM/APNs integration with `expo-notifications`
4. **Native file picking** — `expo-document-picker` + `expo-image-picker` for camera capture
5. **QR code scanning** — `expo-camera` barcode scanning for transfers and event check-in
6. **Image optimization** — Client-side compression before upload
7. **Multi-language support** — i18n with locale detection
8. **Dark/light theme toggle** — Currently dark-only
9. **Admin bulk operations** — Bulk approve/reject KYC, campaigns, redemptions
10. **Advanced analytics** — Charts and graphs for admin dashboard
11. **Referral system** — Track and reward user referrals
12. **Staking/locking** — Lock W3OD Balance for rewards
13. **NFT badges** — Mint badges as NFTs on-chain
14. **2FA/TOTP** — Time-based one-time passwords as alternative to SMS OTP
15. **Audit log export** — CSV/JSON export for compliance
