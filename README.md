# HarvestPro NZ

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="HarvestPro Banner" width="100%" />
</div>

## 🍒 Cherry Harvest Management Platform

HarvestPro NZ is a comprehensive digital solution designed for the cherry industry in New Zealand. It digitizes the entire harvest process from orchard to packhouse, ensuring traceability, efficiency, and compliance with labor regulations.

### 🚀 Key Features

*   **Real-time Tracking:** Monitor harvest velocity, bin fill levels, and crew performance.
*   **Role-Based Interfaces:** Dedicated views for Managers, Team Leaders, and Bucket Runners.
*   **Smart Logistics:** QR code scanning for bins and buckets with duplicate prevention.
*   **Compliance:** Automatic minimum wage calculations and break monitoring.
*   **Communication:** Integrated messaging system (Direct & Group chats) and Broadcast alerts.
*   **Offline First:** Built to work in remote orchards with unreliable connectivity.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS (configured via PostCSS)
*   **Backend / Database:** Supabase (PostgreSQL, Auth, Realtime)
*   **State Management:** Context API (Split Architecture: Auth, Messaging, Harvest)
*   **Testing:** Vitest

---

## 📦 Installation & Setup

### Prerequisites

*   Node.js 18+
*   NPM
*   A Supabase project

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/harvestpro-nz.git
cd harvestpro-nz
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Run the SQL scripts provided in the `sql/` directory in your Supabase SQL Editor:

1.  `supabase_setup.sql`: Creates basic tables.
2.  `simple_messaging_schema.sql`: Sets up the messaging system.
3.  `rls_strict_policies.sql`: **Important** - Applies strict Row Level Security policies.

### 4. Run Locally

```bash
npm run dev
```

---

## 🏗️ Architecture Overview

The application uses a modular Context architecture to manage state efficiently:

*   **`AuthContext`**: Handles authentication, user profile loading, and role management.
*   **`MessagingContext`**: Manages real-time chats, groups, and message synchronization using `simple-messaging.service.ts`.
*   **`HarvestContext`**: Manages operational data (Orchards, Blocks, Pickers, Bins, Buckets).

### Security (RLS)

Data access is strictly controlled via PostgreSQL Row Level Security (RLS) policies:
*   **Pickers/Staff**: Can only be managed by users within the same Orchard.
*   **Messages**: Visible only to senders, recipients, or group members.
*   **Operational Data**: Scoped to the assigned Orchard.

---

## 👥 User Roles

1.  **Manager**:
    *   Command Center Dashboard (Velocity, Forecast, Alerts).
    *   Team Management & Analytics.
    *   Day Setup (Rates, Targets).
    *   Broadcast Messaging.

2.  **Team Leader**:
    *   Crew Management (Onboarding, Attendance).
    *   Row Assignment.
    *   Quality Control Monitoring.

3.  **Bucket Runner**:
    *   Logistics Hub.
    *   Bin & Bucket Scanning (QR/Barcode).
    *   Inventory Management (Empty/Full Bins).

---

## 🧪 Testing

Run the test suite to verify business logic (calculations, payroll, etc.):

```bash
npm run test
```

---

© 2024 HarvestPro NZ
