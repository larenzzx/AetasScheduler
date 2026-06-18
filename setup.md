# ⚙️ Local Development Setup Guide

Follow this guide to set up and run **AetasScheduler** locally on your system.

---

## 📋 Prerequisites

Ensure you have the following installed on your local environment:
*   **Node.js**: Version `18.x` or `20.x` (LTS versions recommended).
*   **npm**: Comes bundled with Node.js.
*   **PostgreSQL**: A running instance (Supabase is recommended for easy deployment and authentication mapping).

---

## 🛠️ Step-by-Step Installation

> [!TIP]
> **Reusing your existing database & user credentials?**
> If you are pointing your local `.env` to your existing database (which already has schema, data, and users populated), you can **skip** steps 3, 4, and 5 entirely. You only need to run `npx prisma generate` in Step 3 to build the local TypeScript bindings for the client.

### 1. Clone & Install Dependencies
Navigate to the project directory in your terminal and install the Node packages:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the sample environment configuration file to create your local `.env` file:
```bash
cp .env.sample .env
```
*(On Windows PowerShell, use `copy .env.sample .env`)*

Open the `.env` file and fill in your connection strings and client keys:
```env
# Connection pooler URL (used by Next.js application at runtime)
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?pgbouncer=true"

# Direct connection URL (used by Prisma for database migrations)
DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<db>"

# Supabase Client configuration for Authentication
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

> [!NOTE]
> If using Supabase, you can find these credentials under **Project Settings** -> **Database** (for Connection Strings) and **API** (for Anon Key and URL).

### 3. Run Database Migrations & Client Generation
If setting up a **new** database instance, run migrations to create the tables:
```bash
npx prisma migrate dev
```
If you are connecting to an **existing** database, or after running migrations, you **must** generate the local Prisma client on your new machine:
```bash
npx prisma generate
```

### 4. Seed the Database
*Skip this step if using an existing database.* Seed the database with the core operational metadata (Shift Types, Employees, default Team Settings, and Scheduling Rules Config):
```bash
npm run seed
```
This executes [seed.ts](file:///C:/Users/markl/coding/aetasscheduler/prisma/seed.ts), which creates default shift types, seeded employees, configurations, and team settings.

### 5. Create an Operator/Admin Account
*Skip this step if using an existing database/user credentials.* Since the portal is protected by middleware authentication, if setting up a new Supabase project, you must create an authorized user in your Supabase Auth module:
1.  Go to your **Supabase Dashboard** for the project.
2.  Navigate to **Authentication** -> **Users**.
3.  Click **Add User** -> **Create User**.
4.  Provide an email (e.g., `admin@aetasglobal.com`) and a secure password.
5.  Uncheck "Auto-confirm user email" or confirm it from the dashboard, then click **Create User**.
6.  You can now use this email and password to log in via the local portal's login screen.

### 6. Run the Development Server
Launch the Next.js local server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser to access the Aetas Global Operations Portal.

---

## 🚀 Building for Production

To test the production build of the application locally:
1.  Compile the project:
    ```bash
    npm run build
    ```
2.  Start the production-ready server:
    ```bash
    npm run start
    ```

---

## 🧹 Troubleshooting & Common Commands

*   **Re-seed or reset database**:
    To completely clear out the database and run migrations and seeds fresh:
    ```bash
    npx prisma migrate reset
    ```
*   **Open Prisma Studio**:
    To explore and edit database tables using a local web UI:
    ```bash
    npx prisma studio
    ```
*   **Updating Custom Job Roles**:
    Job roles are customizable. The default job roles (`SOC_OPERATIONS`, `DESIGNER`, `IT_SUPPORT`, `OTHER`) are automatically initialized by the [job-role.ts Server Action](file:///C:/Users/markl/coding/aetasscheduler/app/actions/job-role.ts) if the database has zero records. Admins can manage these under the Settings page in the UI.
