# Supabase Setup Guide — Daily Activity Monitor

Follow these steps **once** to connect your live Supabase database.
Total time: about 15 minutes.

---

## Step 1 — Create a Free Supabase Account

1. Open **https://supabase.com** in your browser
2. Click **"Start your project"**
3. Sign in with your GitHub account (recommended) or email
4. You will land on the Supabase dashboard

---

## Step 2 — Create a New Project

1. Click **"New project"**
2. Fill in:
   - **Name:** `daily-activity-monitor` (or any name you like)
   - **Database Password:** Choose a strong password and **save it somewhere safe**
   - **Region:** Pick the one closest to your users (e.g. `Canada (Central)` for Canada)
3. Click **"Create new project"**
4. Wait about 2 minutes while Supabase sets up your database

---

## Step 3 — Get Your API Keys

1. In your project, go to **Settings → API** (left sidebar)
2. Copy these two values — you will need them in Step 5:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

> These keys are safe to use in your frontend code. They only allow
> actions that your Row Level Security (RLS) rules permit.

---

## Step 4 — Create the Database Tables

1. In your project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-setup.sql` from your project folder
4. Copy the entire contents and paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" — this is correct
7. Go to **Table Editor** and confirm these tables exist:
   - `profiles`
   - `groups`
   - `group_members`

---

## Step 5 — Add Your Keys to the Website

1. Open the file `supabase-config.js` in your project folder
2. Replace the two placeholder values:

```javascript
var SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
var SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

Replace with your actual values from Step 3:

```javascript
var SUPABASE_URL      = 'https://abcdefgh.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Save the file

---

## Step 6 — Configure Email Verification URLs

Supabase sends real verification emails with a link back to your site.
You need to tell Supabase which URLs are allowed.

1. In Supabase, go to **Authentication → URL Configuration**
2. Set **Site URL** to your GitHub Pages address:
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`
3. Under **Redirect URLs**, click **"Add URL"** and add these:
   - `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/verify.html`
   - `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/reset-password.html`
   - `http://localhost/verify.html` *(for local testing)*
4. Click **"Save"**

> **Important — GitHub Pages subfolder:** Your site lives at
> `https://username.github.io/repo-name/` not just `https://username.github.io/`.
> The code automatically detects the correct path from the current URL,
> so you only need to make sure the redirect URLs above are listed exactly
> as shown (with your real username and repo name).

> **iPhone / Outlook tip:** Email clients sometimes open links in an
> in-app browser that strips URL fragments. If users report a 404 after
> clicking the verification link, ensure your Redirect URLs in Supabase
> match your GitHub Pages URL exactly including the subfolder.

---

## Step 7 — Customise the Verification Email (Optional)

You can change the email your users receive to show your site name.

1. Go to **Authentication → Email Templates**
2. Click **"Confirm signup"**
3. Change the **Subject** to: `Verify your Daily Activity Monitor account`
4. The email body already contains the correct verification link — no changes needed
5. Repeat for **"Reset password"** template if desired
6. Click **"Save"**

---

## Step 8 — Push to GitHub and Go Live

1. Upload all project files to your GitHub repository (including the updated `supabase-config.js`)
2. The GitHub Actions workflow (`deploy.yml`) will automatically deploy your site
3. Wait about 1 minute for deployment to complete
4. Visit your live site at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`
5. Test registration — you should receive a **real verification email**

---

## Step 9 — Verify Everything is Working

Run through this checklist:

- [ ] Register a new account — email arrives in inbox (check spam too)
- [ ] Click the verification link in the email — redirected to `verify.html`
- [ ] Log in with email and password — lands on `home.html`
- [ ] Create a group — appears on Group Dashboard
- [ ] Click "Forgot password?" — reset email arrives in inbox
- [ ] Click reset link — can set new password
- [ ] Log in with new password — works correctly
- [ ] In Supabase Table Editor, check `profiles` table — user row exists

---

## Free Tier Limits (More Than Enough for You)

| Resource | Free Limit | Your Need |
|---|---|---|
| Monthly active users | 50,000 | ~20,000 |
| Database storage | 500 MB | < 50 MB to start |
| Auth emails sent | 4 per hour* | Fine for gradual growth |
| API requests | Unlimited | — |
| Automatic backups | 1 day | Included |

*The 4/hour email limit applies to the built-in Supabase email provider.
If you need more, go to **Authentication → SMTP Settings** and connect
a free [Resend](https://resend.com) or [SendGrid](https://sendgrid.com)
account — both have generous free tiers (100 emails/day free on Resend).

---

## Upgrading to Pro ($25/month) When Ready

When your user base grows beyond the free tier:
1. Go to **Settings → Billing** in your Supabase dashboard
2. Click **"Upgrade to Pro"**
3. Enter payment details
4. No code changes needed — everything continues working

Pro plan gives you: 100,000 monthly active users, 8 GB database,
daily backups, no project pausing, and priority support.

---

## Troubleshooting

**"Invalid API key" error on the website**
→ Double-check `supabase-config.js` — make sure there are no extra spaces
  around the URL or key values.

**Verification email not arriving**
→ Check spam/junk folder first. Then go to Supabase → Authentication →
  Users and confirm the user was created. Check URL Configuration matches
  your GitHub Pages URL exactly.

**"new row violates row-level security policy" error**
→ Re-run `supabase-setup.sql` in the SQL Editor. The RLS policies may not
  have been created correctly.

**Users table shows empty in Supabase after registration**
→ Check the `handle_new_user` trigger was created. Go to
  Database → Functions and look for `handle_new_user`.

**Reset password link gives "Invalid or expired link"**
→ Confirm `reset-password.html` is listed in Supabase → Authentication →
  URL Configuration → Redirect URLs.
