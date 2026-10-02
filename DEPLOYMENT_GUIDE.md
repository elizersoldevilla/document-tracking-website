# CLEAR Document Tracking — Production Deployment Guide (Option A)

## Hard Constraint
**InfinityFree free hosting ONLY runs PHP + MySQL.** This app is Node.js/Express + MySQL and **cannot** run on InfinityFree's free plan. Attempting to upload `dist/` files alone will result in a blank page because there's no Node.js API backend.

## Option A — Node Hosting (Recommended)
Deploy the entire app (Express API + React client) to a Node.js-capable host, then point `centralizedlogging.ct.ws` DNS at it.

### Recommended Host: Render.com (free tier)
1. **Create a Render account** at <https://render.com>
2. **Connect your Git repo** (push this project to GitHub/GitLab first, or use the "New Web Service" upload flow).
3. **Create a new Web Service**:
   - Name: `clear-document-tracking`
   - Environment: `Node`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
4. **Add Environment Variables** (in the Render dashboard → Service → Environment):
   - `NODE_ENV=production`
   - `APP_ORIGIN=https://centralizedlogging.ct.ws`
   - `COOKIE_SECURE=true`
   - `JWT_SECRET=<generate 48+ random chars>` (use `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
   - `DB_HOST=<your external MySQL host>` (e.g., `aws.connect.mysql.net`, `tidb-cloud...`, or Aiven)
   - `DB_PORT=4000` (default for external TLS MySQL; change if your provider uses different port)
   - `DB_USER=<your MySQL username>`
   - `DB_PASSWORD=<your MySQL password>`
   - `DB_NAME=clear_live_demo` (or whatever database name you create)
   - `DB_SSL=true`
   - `ALLOW_DEMO_SEED=false`
   - `DEMO_LOGIN_ENABLED=false`
5. **Click "Create Web Service"** — Render will build and start the app.
6. **Record the generated URL**, e.g., `https://clear-document-tracking.onrender.com`

### Point the Domain `centralizedlogging.ct.ws` to Render
1. **Change nameservers** at your domain registrar (nameservers.ct.ws) to Render's nameservers:
   - `ns1.render.com`
   - `ns2.render.com`
2. **Add a CNAME record** in the registrar DNS panel:
   - Host: `centralizedlogging`
   - Value: `clear-document-tracking.onrender.com`
   - TTL: auto/default
3. **Wait 5–30 minutes** for DNS propagation.
4. **Test**: visit `https://centralizedlogging.ct.ws` — you should see the CLEAR login screen.

### Set Up External MySQL
- **Free options**: 
  - **TIDB Serverless** (TiDB Cloud) — create a free cluster, note the host, port, user, password, and `?ssl-ca=/path/to/ca.pem` flag.
  - **Aiven MySQL** — free tier available, requires `ssl: { rejectUnauthorized: true }` (modify `parseSsl` in `pool.js` if needed).
- **Set the env vars** listed in step 4 with your external MySQL credentials.
- Run `npm run db:migrate` locally first to verify, then Render will run it on first start (the migration creates the database/tables idempotently).

### Verify Locally Before Deploying
Run the production build locally to confirm everything works:
```powershell
$env:NODE_ENV="production"
$env:PORT="3100"
$env:APP_ORIGIN="http://localhost:3100"
$env:COOKIE_SECURE="false"
$env:DB_NAME="clear_live_demo"
$env:DB_SSL="false"
node server/src/index.js
# Then curl http://localhost:3100/api/health and http://localhost:3100/
```
If both return healthy responses, you're ready to deploy.

## Option B — Split Hosting (Frontend on InfinityFree + API elsewhere)
**Not recommended** — requires cross-origin CORS + `SameSite=None; Secure` cookies, which breaks the session/CSRF design. If you absolutely must, upload the `dist/` contents to InfinityFree via FTP, and deploy the `server/` code to a Node host, but you'll need to reconfigure auth cookies for cross-origin.

## Verification Checklist
After deployment, confirm:
- `GET https://centralizedlogging.ct.ws/api/health` → `{ success: true, database: "connected" }`
- `GET https://centralizedlogging.ct.ws/` → serves the React app
- `GET https://centralizedlogging.ct.ws/application` → loads the Application page
- Student login with `student@clear.edu` / `StudentDemo2026!` works
- "New request" nav item lands on `/application/9/requirements`
- Required Documents page forms and submission flow work end-to-end

## Rollback
If anything fails, Render lets you "Disable" the service (keeps the URL but shows a placeholder). Change the DNS nameservers back to `ns2.ct.awsdns-20.com` etc. to return to InfinityFree parking page.

---
**Need help with the Render dashboard or MySQL SSL config?** Let me know your host choice and I can walk you through the exact clicks.