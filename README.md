# EM Physician Job Search Dashboard

Automated job aggregation and filtering for Emergency Medicine physician positions. Scrapes multiple job boards, uses AI to classify and filter results, and displays everything on a clean web dashboard.

## Quick Start

### 1. Install Python dependencies

```bash
cd JOBS
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
# source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
```

### 2. Set up API keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

You need:
- **ANTHROPIC_API_KEY** — Get from [console.anthropic.com](https://console.anthropic.com/)
- **SERPAPI_KEY** — Get from [serpapi.com](https://serpapi.com/) (free tier: 100 searches/month)
- **ADZUNA_APP_ID** and **ADZUNA_APP_KEY** — Get from [developer.adzuna.com](https://developer.adzuna.com/)

### 3. Run the scraper

```bash
python run_scraper.py
```

This fetches jobs from all sources, classifies them with AI, and saves results to `data/jobs.json` and `data/rejected.json`.

### 4. View the dashboard locally

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the root directory to `dashboard`
4. Deploy — you'll get a public URL to share

## Customizing Job Criteria

Edit `config.yaml` to change:
- **Locations** — Add/remove cities, adjust priorities
- **Salary** — Change minimum and target range
- **Excluded employers** — Add hospital systems to block
- **Search queries** — Modify the search terms used

After editing, run `python run_scraper.py` again.

## Automated Daily Scraping

The GitHub Actions workflow (`.github/workflows/scrape.yml`) runs the scraper daily at 7:00 AM CT. To enable it:

1. Push to GitHub
2. Go to Settings > Secrets and variables > Actions
3. Add these secrets: `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
4. The scraper will run automatically and commit updated data

You can also trigger a manual run from the Actions tab.

## Cost

~$10-20/month total:
- Claude API (job classification): $5-15/month
- SerpApi: Free tier (100 searches/month) or ~$5/month
- Adzuna API: Free tier
- Vercel hosting: Free
- GitHub Actions: Free
