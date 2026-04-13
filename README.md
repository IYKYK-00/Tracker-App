# Tracker PWA

A personal count-up / count-down tracker that runs as a native-feeling app on your iPhone.  
**All data stays on your device** — localStorage only, no server, no database, no third-party anything.

---

## What You Need Before Starting

- **A Mac, PC, or Linux machine** (for the one-time build step)
- **Node.js 18+** installed → [https://nodejs.org](https://nodejs.org) (grab the LTS version)
- **A free GitHub account** → [https://github.com](https://github.com)
- **Git** installed (comes with macOS; on Windows install [Git for Windows](https://git-scm.com))

If you already have Node and Git, you're ready. Verify with:

```
node -v
git --version
```

---

## Step 1 — Download This Project

Download the ZIP of this project from Claude and unzip it, or if you've already created a GitHub repo, clone it.

Open a terminal and `cd` into the project folder:

```bash
cd ~/Downloads/tracker-pwa    # or wherever you unzipped it
```

---

## Step 2 — Install Dependencies & Build

```bash
npm install
npm run build
```

This creates a `dist/` folder — that folder IS your entire app. It contains static HTML/CSS/JS files and a service worker for offline support. No server needed.

**Optional:** preview it locally first:

```bash
npm run preview
```

Then open `http://localhost:4173` in your browser to test.

---

## Step 3 — Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it something like `tracker` (or whatever you want)
3. Set it to **Public** (required for free GitHub Pages hosting)
4. Do NOT initialize with a README (you already have one)
5. Click **Create repository**

---

## Step 4 — Push Your Code

Back in your terminal, inside the project folder:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 5 — Deploy to GitHub Pages

You have two options. **Option A** is the simplest.

### Option A — Deploy the `dist/` folder directly

After building (`npm run build`), push the dist folder to a special branch:

```bash
npx gh-pages -d dist
```

If `gh-pages` isn't installed, it will prompt you — say yes, or install it first:

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

Then go to your repo on GitHub → **Settings** → **Pages** → under "Source" select the `gh-pages` branch → Save.

Your app will be live at: **`https://YOUR_USERNAME.github.io/tracker/`**

> **Note:** If you use a repo name other than `tracker`, you need to update `vite.config.js` and add `base: '/YOUR_REPO_NAME/'` to the config object so asset paths resolve correctly.

### Option B — Use GitHub Actions (auto-deploy on every push)

Create the file `.github/workflows/deploy.yml` in your project:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Push this file, and GitHub will automatically build and deploy every time you push to `main`.

---

## Step 6 — Install on Your iPhone

1. Open **Safari** on your iPhone (must be Safari — Chrome/Firefox won't work for this)
2. Go to `https://YOUR_USERNAME.github.io/tracker/`
3. Tap the **Share** button (the square with an arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Name it "Tracker" (or whatever you like) and tap **Add**

That's it. The app now lives on your home screen, launches full-screen with no browser chrome, and works offline after the first load.

---

## How Data Works

- All tracker data is stored in your browser's `localStorage`
- It never leaves your device — there is no server, no API calls, no analytics
- Data persists across app launches and phone restarts
- Clearing Safari's website data WILL erase your trackers, so avoid that
- Each device has its own independent data (no sync between devices)

---

## Making Changes Later

Edit the code in `src/App.jsx`, then:

```bash
npm run build
npx gh-pages -d dist
```

Or if you set up GitHub Actions (Option B), just push to `main` and it auto-deploys.

---

## Alternate Free Hosts (if you prefer)

| Host | How |
|------|-----|
| **Netlify** | Drag-and-drop the `dist/` folder at [app.netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | `npx vercel --prod` from the project root |
| **Cloudflare Pages** | Connect your GitHub repo at [pages.cloudflare.com](https://pages.cloudflare.com) |

All are free-tier, all serve static files, all support HTTPS (required for PWA service workers).

---

## Project Structure

```
tracker-pwa/
├── index.html            ← entry point with iOS PWA meta tags
├── vite.config.js        ← build config + PWA plugin
├── package.json          ← dependencies
├── public/
│   └── icons/            ← app icons (192px + 512px)
├── src/
│   ├── main.jsx          ← React mount point
│   └── App.jsx           ← the entire app (single file)
└── dist/                 ← generated after `npm run build`
```
