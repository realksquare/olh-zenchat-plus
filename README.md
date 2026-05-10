# ZenChat+

A real-time mobile chat app built with **Elixir/Phoenix** on the backend and **React Native (Expo)** on the client. ZenChat+ is the native evolution of the original Vanilla ZenChat PWA — rebuilt from the ground up for reliability, speed, and zero strings attached.

---

## From Vanilla ZenChat PWA to ZenChat+

The original **ZenChat** was a Progressive Web App (PWA) — a browser-based chat platform installable on mobile via the browser. It proved the concept: real-time messaging, a clean dark UI, and a WebSocket backbone. But a PWA has hard limits — no native push notifications when the browser is closed, no reliable background delivery, and performance capped by the webview layer.

**ZenChat+** is the successor. It keeps everything that made Vanilla ZenChat work and throws away everything that held it back:

| Feature | Vanilla ZenChat (PWA) | ZenChat+ |
|---|---|---|
| Platform | Browser PWA | Native Android (Expo) |
| Push Notifications | Limited (only when tab open) | Full FCM push, even when app is closed |
| Offline delivery | None | Pending message delivery on reconnect |
| Media upload | Basic | Cloudinary-backed, resilient upload |
| Auth | Session-based | JWT via Guardian, stored in SecureStore |
| Real-time | Phoenix Channels (WebSocket) | Phoenix Channels (WebSocket) — same engine |
| Moments | Not present | 24-hour ephemeral media stories |
| Admin panel | None | Full admin — verify users, manage roles, suspend |

The WebSocket layer (Phoenix Channels) is shared DNA — ZenChat+ inherits the same proven real-time foundation and extends it with a proper native client.

---

## What ZenChat+ Does

- **Real-time messaging** — text, images, replies, edits, delete-for-everyone or delete-for-self
- **Delivery & read receipts** — sent → delivered → seen, tracked per-message
- **Typing indicators** — live scramble mode for mutual contacts
- **Moments** — 24-hour story-style media posts with view counts, auto-expired server-side
- **Aura Avatars** — ring indicators on avatars showing who has active Moments
- **Music on Moments** — attach a Spotify track to a Moment
- **Push notifications** — Firebase Cloud Messaging, server-side delivery to FCM tokens
- **Pending message delivery** — messages sent while offline are pushed on reconnect
- **View-once media** — self-destructing image messages
- **Pin & unpin chats** — pinned chats always surface to the top
- **User search & contact system** — find users by username or email
- **Profile editing** — username, avatar (Cloudinary), password change
- **Admin panel** — live user stats, role management (master_admin / co_admin), verification badges, account suspension

---

## Reliability on Unstable Networks

ZenChat+ is engineered for real-world mobile conditions, including slow and intermittent connections like 2G:

- **Optimistic UI** — messages appear immediately in the UI with a client-side ID (`cid`). When the server confirms, the optimistic entry is replaced in-place. The user never waits.
- **Pending delivery on reconnect** — the server tracks `is_delivered` per message. When a user reconnects after being offline, the server pushes all undelivered messages to their socket in a single batch.
- **Minimal payloads** — Phoenix Channel events carry only the necessary fields. No bloated JSON, no redundant polling.
- **Pool-size aware DB** — the backend runs on a pool size of `1` on the free tier, deliberately configured to stay within Gigalixir's free Postgres connection limit without crashing.
- **Connection resilience** — the Phoenix Socket client auto-reconnects with backoff. On `onClose` / `onError`, the `isConnected` state is updated and the socket retries automatically.
- **Low-quality image uploads** — media picked from the gallery is compressed to `quality: 0.75` before upload to reduce bandwidth usage.
- **No polling** — the entire architecture is event-driven over a persistent WebSocket. No periodic HTTP requests consuming bandwidth in the background.

---

## No Strings Attached

ZenChat+ is free. Completely, permanently, unconditionally free.

- **No ads.** The app has no advertising SDK, no tracking pixels, no analytics calls home.
- **No payment.** No premium tier, no subscription, no locked features, no "Pro" plan.
- **No data brokering.** User data stays in the app's own Postgres database. Nothing is sold, shared, or profiled.
- **Open code.** This repository is public. You can read every line of what the server does with your messages.

The infrastructure runs on [Gigalixir](https://gigalixir.com)'s free tier — a deliberate choice to keep operating costs at zero and ensure the app can run indefinitely without needing to monetize users.

---

## Stack

**Backend (`zen_server`)**
- Elixir + Phoenix Framework
- PostgreSQL via Ecto
- Phoenix Channels (WebSocket)
- Guardian (JWT auth)
- Cloudinary (media storage)
- Firebase Cloud Messaging (push notifications)
- Finch (HTTP client)
- Joken (JWT signing for FCM)
- Deployed on Gigalixir

**Client (`zen_client`)**
- React Native via Expo (~54)
- React Navigation (bottom tabs + native stack)
- Phoenix JS client (`phoenix` npm package)
- Expo SecureStore (token storage)
- Expo Notifications (FCM)
- Expo ImagePicker + Cloudinary upload
- Lucide React Native (icons)
- Axios (REST API)

---

## Project Structure

```
olh-zenchat-plus/
├── zen_client/          # React Native Expo app
│   ├── src/
│   │   ├── components/  # Reusable UI (ChatCard, MessageBubble, AuraAvatar, ...)
│   │   ├── contexts/    # AuthContext, ChatContext, SocketContext
│   │   ├── hooks/       # useSocket
│   │   ├── navigation/  # AppNavigator (stack + tabs)
│   │   ├── screens/     # Login, Home, Chat, Moments, MomentViewer, Admin
│   │   ├── services/    # api.js, storage.js, notifications.js, upload.js
│   │   └── theme/       # Color palette, spacing, typography, shadows
│   └── app.json
└── zen_server/          # Elixir/Phoenix backend
    ├── lib/zen_server/
    │   ├── channels/    # UserChannel, ChatChannel, UserSocket
    │   ├── controllers/ # Auth, Chat, Message, Moment, Music, Admin
    │   ├── plugs/       # Auth plug (JWT verification)
    │   ├── schema/      # User, Chat, Message, Moment Ecto schemas
    │   ├── services/    # Cloudinary, Firebase
    │   ├── presence.ex  # Custom GenServer presence tracker
    │   └── moment_sweeper.ex  # Hourly expired-moment cleanup
    └── config/
```

---

*Built by the OLH Dev Team.*
