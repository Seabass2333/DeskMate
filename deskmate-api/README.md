# DeskMate API

Backend API for DeskMate, replacing Supabase.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Setup database
```bash
# Generate migration
npm run db:generate

# Apply to database
npm run db:push
```

### 4. Run
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/send-otp` | POST | Send OTP to email |
| `/api/auth/verify-otp` | POST | Verify OTP |
| `/api/auth/bind-device` | POST | Bind device to user |
| `/api/invite/verify` | POST | Verify invite code |
| `/api/invite/status` | POST | Get VIP status |
| `/api/settings/save` | POST | Save setting |
| `/api/settings/get` | POST | Get settings |
| `/api/analytics/track` | POST | Track event |
| `/api/ops/announcements` | POST | Get announcements |
| `/api/ops/feedback` | POST | Submit feedback |
