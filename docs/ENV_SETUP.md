# Environment Setup - Open Data Platform

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)
- **Code Editor**: VS Code recommended

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd open-data-platform
```

---

### 2. Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`, including:
- React, React Router
- Vite (build tool)
- Tailwind CSS
- TanStack Query
- Supabase JS Client
- shadcn/ui components
- TypeScript

---

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy **Project URL** and **anon/public key**

**Security Notes:**
- The `anon` key is safe to expose in client-side code
- Row-Level Security (RLS) policies protect your data
- Never commit `.env` to version control (already in `.gitignore`)

---

### 4. Supabase Project Configuration

#### Option A: Use Existing Supabase Project

If you have an existing Supabase project with the schema:

1. Copy `.env.example` to `.env`
2. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Ensure all migrations are applied (see Migration section)

#### Option B: Create New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name**: Open Data Platform
   - **Database Password**: (strong password)
   - **Region**: Choose closest to your users
4. Wait for project to provision (2-3 minutes)
5. Copy URL and anon key to `.env`
6. Apply migrations (see Migration section)

---

### 5. Database Migrations

#### Using Supabase Dashboard (Recommended for first setup)

1. Go to **SQL Editor** in Supabase Dashboard
2. Navigate to `supabase/migrations/` folder in your project
3. Copy each migration file content
4. Paste into SQL Editor
5. Click **Run**
6. Repeat for all migration files in order

#### Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

---

### 6. Generate TypeScript Types

After applying migrations, generate TypeScript types:

```bash
# Using Supabase CLI
supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

**Or manually:**
1. Go to Supabase Dashboard → **API Docs**
2. Scroll to **TypeScript Types**
3. Copy the generated types
4. Paste into `src/integrations/supabase/types.ts`

---

### 7. Start Development Server

```bash
npm run dev
```

This starts Vite dev server at `http://localhost:8080`

**Features:**
- Hot Module Replacement (HMR)
- TypeScript compilation
- Tailwind CSS processing
- Instant updates on file save

---

### 8. Verify Setup

Open `http://localhost:8080` in your browser. You should see:
- Home page with dataset discovery
- Search bar
- Categories section
- Empty dataset list (if no data seeded)

**If you see errors:**
- Check browser console for details
- Verify `.env` variables are correct
- Ensure Supabase project is active
- Check that RLS policies are enabled

---

## Project Scripts

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Type Checking
```bash
npm run typecheck    # Check TypeScript errors
```

---

## Initial Data Seeding

### Create First Admin User

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User**
3. Fill in:
   - **Email**: admin@example.com
   - **Password**: (strong password)
   - **Auto Confirm**: Yes
4. Click **Create User**

### Assign Admin Role

```sql
-- Run this in Supabase SQL Editor
-- Replace 'user-uuid' with actual user ID from auth.users

-- First, get the ADMIN role ID
SELECT id FROM org_roles WHERE code = 'ADMIN';

-- Then assign the role
INSERT INTO org_user_roles (user_id, role_id)
VALUES (
  'user-uuid',
  (SELECT id FROM org_roles WHERE code = 'ADMIN')
);
```

### Create Sample Organization

```sql
INSERT INTO org_organizations (name, short_name, org_type)
VALUES ('National Statistics Agency', 'NSA', 'GOVERNMENT');
```

### Create Sample Dataset

1. Login with admin credentials
2. Navigate to `/admin/datasets`
3. Click **Add Dataset**
4. Fill in the form:
   - Title: "Population Statistics 2024"
   - Description: "Annual population data by region"
   - Classification: PUBLIC
   - Status: PUBLISHED
5. Click **Save**

---

## Configuration Files

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Key Settings:**
- **Server host**: `::` (binds to all interfaces)
- **Port**: 8080
- **Alias**: `@` maps to `src/` directory
- **React Plugin**: Uses SWC for fast compilation

---

### tailwind.config.ts

```typescript
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens from index.css
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        // ... more colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**Key Settings:**
- **Target**: ES2020
- **JSX**: react-jsx (new JSX transform)
- **Strict**: Enabled for type safety
- **Path Alias**: `@/*` maps to `src/*`

---

## IDE Setup (VS Code)

### Recommended Extensions

Install these VS Code extensions:

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Linting and auto-fix
2. **Prettier** (`esbenp.prettier-vscode`)
   - Code formatting
3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
   - Autocomplete for Tailwind classes
4. **TypeScript Vue Plugin (Volar)** (`Vue.volar`)
   - Better TypeScript support
5. **Supabase** (`supabase.supabase-vscode`)
   - Supabase integration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Troubleshooting

### Issue: "Cannot connect to Supabase"

**Solutions:**
1. Verify `.env` file exists and has correct values
2. Check Supabase project is active (not paused)
3. Verify network connection
4. Check browser console for CORS errors

---

### Issue: "Row-Level Security policy violation"

**Solutions:**
1. Ensure user is authenticated
2. Check user has correct roles in `org_user_roles`
3. Verify RLS policies are applied correctly
4. Use Supabase Dashboard → **Database** → **Policies** to review

---

### Issue: "Module not found: @/components/..."

**Solutions:**
1. Restart dev server (`npm run dev`)
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check tsconfig.json `paths` configuration

---

### Issue: Types are outdated after migration

**Solution:**
```bash
# Regenerate types
supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts

# Restart dev server
npm run dev
```

---

### Issue: Hot reload not working

**Solutions:**
1. Check file permissions
2. Disable browser cache
3. Use hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Restart dev server

---

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates optimized files in `dist/` folder:
- Minified JavaScript
- Optimized CSS
- Static assets
- Index HTML

---

### Deploy to Lovable (Recommended)

Lovable provides automatic deployment:

1. Connect GitHub repository
2. Push changes to main branch
3. Automatic build and deploy
4. Custom domain support

---

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

**Netlify Configuration:**
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Environment variables**: Add from Netlify dashboard

---

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Vercel Configuration:**
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add from Vercel dashboard

---

### Environment Variables for Production

Ensure these are set in your hosting platform:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

**Security Notes:**
- Use production Supabase project (not dev)
- Enable RLS on all tables
- Review and test all RLS policies
- Enable Supabase SSL (default)

---

## Database Backup & Recovery

### Manual Backup (Supabase Dashboard)

1. Go to **Database** → **Backups**
2. Click **Create Backup**
3. Wait for completion
4. Download backup file

### Automatic Backups

Supabase automatically backs up your database:
- **Free tier**: Daily backups, 7-day retention
- **Pro tier**: Daily backups, 30-day retention
- **Point-in-time recovery** available on Pro+

---

## Monitoring & Logging

### Supabase Dashboard

Monitor your application:
- **Database**: Query performance, table sizes
- **Auth**: User signups, sessions
- **API**: Request volume, errors
- **Logs**: Real-time logs from functions

### Browser DevTools

- **Console**: Error messages, warnings
- **Network**: API calls, response times
- **React DevTools**: Component hierarchy, props

---

## Performance Tips

1. **Use indexes** on frequently queried columns
2. **Limit results** with `.limit()` in queries
3. **Select only needed fields** instead of `*`
4. **Use TanStack Query cache** to avoid redundant requests
5. **Lazy load images** with `loading="lazy"`
6. **Code split** large components with React.lazy()

---

## Security Checklist

- [x] RLS enabled on all tables
- [x] RLS policies tested for each role
- [x] Roles stored in separate table (not profiles)
- [x] Security definer functions for role checks
- [x] Environment variables not committed
- [x] HTTPS enabled (automatic on Supabase/Lovable)
- [x] CORS configured correctly
- [ ] Rate limiting (configure in Supabase)
- [ ] Content Security Policy (CSP) headers
- [ ] Regular security audits

---

## Additional Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vite Docs**: [vitejs.dev](https://vitejs.dev)
- **React Docs**: [react.dev](https://react.dev)
- **Tailwind CSS Docs**: [tailwindcss.com](https://tailwindcss.com)
- **TanStack Query Docs**: [tanstack.com/query](https://tanstack.com/query)
- **shadcn/ui Docs**: [ui.shadcn.com](https://ui.shadcn.com)
- **Lovable Docs**: [docs.lovable.dev](https://docs.lovable.dev)

---

## Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **Lovable Discord**: [discord.com/invite/lovable](https://discord.com/invite/lovable)
- **Stack Overflow**: Tag with `supabase`, `react`, `vite`
