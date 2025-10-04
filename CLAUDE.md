# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
```bash
# Copy environment template
cp .env.example .env

# Install dependencies
pip install -r requirements.txt
```

### Running Locally
```bash
# Start development server
python app.py

# Server runs at http://127.0.0.1:5000
```

## Architecture Overview

### Backend (Flask)
- **Main file**: `app.py` (~770 lines)
- **Pattern**: REST API serving JSON to frontend
- **Caching**: FileSystemCache with 30s-3600s TTL per endpoint
- **External API**: Last.fm API for all music data

### Frontend (JavaScript)
- **Main file**: `static/app.js` (~1,250 lines)
- **Libraries**: Chart.js for visualizations
- **Responsibilities**:
  - Live refresh (30s intervals when enabled)
  - Theme management (dark/light/system with Catppuccin colors)
  - All chart rendering and data visualization
  - Hipster score display logic

### Hipster Score Algorithm
**Shared between backend (Python) and frontend (JavaScript)**

```
Score = 140 - (log10(listeners) × 20)
Clamped to [0, 100]
```

Categories:
- Ultra Hipster: 85-100 (<~300 listeners)
- Underground: 60-85 (<~10K listeners)
- Indie: 35-60 (<~1M listeners)
- Popular: 10-35 (<~100M listeners)
- Mainstream: 0-10 (>100M listeners)

**Important**: This formula exists identically in:
- `app.py`: `calculate_hipster_score()` function (lines 33-46)
- `static/app.js`: Constants `HIPSTER_BASE_SCORE` and `HIPSTER_SCALE_FACTOR` (lines 2-3)

When modifying the algorithm, update both locations.

## Data Flow Patterns

### API Endpoints
All endpoints return JSON and are cached:

- `/api/lastfm/last-played` - Current/last track (30s cache)
- `/api/lastfm/recent-tracks` - Recent listening history (30s cache)
- `/api/lastfm/top-artists?period=<period>` - Top artists for period (300s cache)
- `/api/lastfm/artist-history/<name>?weeks=N&aggregate=<day|week|month>` - Historical plays (3600s cache)
- `/api/lastfm/genre-profile?periods=<comma-separated>` - Genre percentages across periods (300s cache)
- `/api/lastfm/top-genres?period=<period>` - Top genres by playcount (300s cache)
- `/api/lastfm/music-stats?period=<period>` - Average hipster score and distribution (300s cache)

### Frontend Fetching Pattern
1. Page load triggers parallel async fetches for all sections
2. Charts initialize with Chart.js config including Catppuccin colors
3. Theme changes trigger color updates on all chart instances
4. Live mode polls `/last-played`, `/recent-tracks`, `/top-artists` every 30s

### Chart Rendering
Charts use CSS custom properties (`--ctp-*`) for colors, allowing dynamic theme switching. When theme changes:
1. `applyTheme()` updates `data-theme` attribute
2. `updateChartColors()` reads new CSS values and updates all Chart.js instances
3. Data sections re-render to update hipster badge colors

## Configuration

### Environment Variables (.env)
```bash
LASTFM_API_KEY=           # Required: Get from https://www.last.fm/api/account/create
LASTFM_USERNAME=          # Required: Your Last.fm username
FLASK_ENV=development     # Optional: Flask environment
RECENT_TRACKS_LIMIT=10    # Optional: Number of recent tracks to show
TOP_ARTISTS_WEEK_LIMIT=10 # Optional: Number of top artists to display
SHOW_RECENT_TRACKS_GENRES=true  # Optional: Fetch genres for recent tracks (slower)
```

### Display Customization
To change how many items appear in different sections, modify env vars:
- `RECENT_TRACKS_LIMIT`: Controls grid of recent tracks
- `TOP_ARTISTS_WEEK_LIMIT`: Controls top artists list and affects genre calculations

## Deployment

### Production Environment
- **Host**: InMotion shared hosting
- **Method**: CGI via `main.cgi` wrapper
- **Web server**: Apache with `.htaccess` for CGI routing
- **Path**: `/home/bennymagid/public_html/ears`

### Deployment Process
Automated via GitHub Actions (`.github/workflows/deploy.yml`):
1. Triggered on push to `main` or manual workflow dispatch
2. SCP copies: `app.py`, `main.cgi`, `.htaccess`, `requirements.txt`, `static/`, `templates/`
3. SSH fixes permissions and ownership
4. **Note**: `.env` is NOT deployed - must be manually configured on server

### Manual Deployment
If GitHub Actions fails:
```bash
# SCP files to server
scp -r app.py main.cgi .htaccess requirements.txt static templates user@host:/home/bennymagid/public_html/ears

# SSH to fix permissions
ssh user@host
cd /home/bennymagid/public_html/ears
chmod +x main.cgi
chmod 644 .htaccess
```

## Common Modification Patterns

### Adding a New Chart/Visualization
1. Add endpoint in `app.py` with appropriate caching
2. Add Chart.js initialization in `static/app.js`
3. Register chart instance in `updateChartColors()` for theme support
4. Add HTML canvas element in `templates/index.html`

### Modifying Hipster Score
1. Update formula in `app.py` `calculate_hipster_score()`
2. Update constants/formula in `static/app.js` (lines 2-3 and related functions)
3. Update explanation in `generateHipsterExplanation()` if visible to users

### Adding New Time Period
1. Add to `valid_periods` list in `/api/lastfm/top-artists` endpoint
2. Add option to `<select id="period-selector">` in `templates/index.html`
3. Period is passed via query string to all relevant endpoints

### Theme/Color Changes
- Colors defined as CSS custom properties in `static/style.css` (lines 1-59)
- Dark theme (Catppuccin Mocha): `:root[data-theme="dark"]`
- Light theme (Catppuccin Latte): `:root[data-theme="light"]`
- Chart colors automatically update via `updateChartColors()` function
