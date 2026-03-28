# Daily Activity Monitor

A web application for individuals and families to plan, schedule, and track daily activities — solo or as a group.

---

## 🌐 Live Site

Once deployed, your site will be available at:
```
https://<your-github-username>.github.io/<repository-name>/
```

---

## 📁 Project Structure

```
/
├── index.html               # Main landing page
├── register.html            # User registration (with validation + age gate)
├── login.html               # User login
├── home.html                # Post-login home (Create/Join Group)
├── create-group.html        # Group creation page
├── join-group.html          # Join existing group by invite code
├── group-dashboard.html     # Group dashboard
├── personal-dashboard.html  # Personal schedule dashboard
├── contact.html             # Contact information
├── verify-pending.html      # Post-registration: waiting for email verification
├── verify.html              # Email verification landing page (token from URL)
├── backend-guide.html       # Backend integration guide (Firebase/Supabase/Node.js)
├── session.js               # Shared session management, auth guard, nav rendering
├── styles.css               # All styles (Phase 1 + 2 + 3)
├── main.js                  # Shared JS (navbar, hamburger, iOS fixes)
├── register.js              # Registration logic + localStorage + Users.txt
├── login.js                 # Login logic
├── create-group.js          # Group creation logic
├── .nojekyll                # Prevents Jekyll processing on GitHub Pages
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions auto-deploy workflow
```

---

## 🚀 How to Deploy on GitHub Pages

### Step 1 — Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in.
2. Click **"New repository"**.
3. Name it (e.g. `daily-activity-monitor`).
4. Set it to **Public** (required for free GitHub Pages).
5. Click **"Create repository"**.

### Step 2 — Upload Files

**Option A — GitHub Web UI (no Git required):**
1. Open your new repository.
2. Click **"uploading an existing file"**.
3. Drag and drop ALL project files (including the `.github` folder).
4. Click **"Commit changes"**.

**Option B — Git command line:**
```bash
git init
git add .
git commit -m "Initial commit — Daily Activity Monitor"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repository, go to **Settings → Pages**.
2. Under **Source**, select **"GitHub Actions"**.
3. The workflow (`.github/workflows/deploy.yml`) will auto-run on every push.

### Step 4 — Access Your Site

After the workflow completes (usually ~1 minute):
- Go to **Settings → Pages** to see your live URL.
- Share it with anyone!

---

## ⚙️ Features by Phase

### Phase 1 — Look & Feel
- Title: **Daily Activity Monitor** (Libre Baskerville font, Deep Black)
- Navigation: Group Dashboard · My Dashboard · Contact Us · Login · Register
- Background: White, Darker 40%
- Responsive hero with animated calendar card

### Phase 2 — Compatibility
- ✅ Laptop · Tablet · Mobile
- ✅ iOS · Android · Windows
- ✅ Chrome · Safari · Edge (all platforms)
- ✅ iPhone Chrome / Edge / Safari
- ✅ Android Chrome / Edge
- ✅ Touch targets ≥ 44px (WCAG)
- ✅ iPhone notch/Dynamic Island safe areas
- ✅ Dark mode support
- ✅ Reduced motion support
- ✅ Print styles

### Phase 3 — Access & Groups
- User Registration with full field validation
- Age gate: 18+ only
- Duplicate detection (name + email + phone)
- Users saved to `localStorage`; **Users.txt** downloaded on each registration
- Login with email + password
- Create Group (creator = admin by default)
- Relationship dropdown: Father, Mother, Son, Daughter, Sister, Brother, etc.
- Dynamic member cards with Add/Remove
- Live welcome message preview
- Join Group by invite code
- Group data persisted in `localStorage`

---

## 📝 Data Storage Note

This is a **pure frontend** application with no backend server. User data is stored in the browser's `localStorage`. A `Users.txt` file is automatically downloaded every time a new user registers, giving you an offline record of all registered users with these fields:

```
First Name | Last Name | Email | Date of Birth | Phone Number |
House Number | Street Number | Street Name | Province | Country |
Group Name | Is Customer Admin?
```

---

## 🔮 Future Phases

- Backend integration (Node.js / Firebase / Supabase)
- Personal dashboard with calendar scheduling
- Group activity tracking
- Email verification flow
- Push notifications
