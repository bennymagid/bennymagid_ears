# Benny's Ears

A personal Last.fm dashboard showing real-time listening activity, top artists, genre evolution, and "hipster scores" based on artist popularity.
Currently hosted at https://bennymagid.com/ears/

## Features

- 🎵 Live now-playing display
- 📊 Top artists with customizable time periods
- 📈 Listening history charts
- 🎨 Genre distribution and evolution
- 🎸 Hipster score calculation (based on artist listener count)
- 🌙 Dark/light theme support

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Last.fm credentials:
   - Get an API key from https://www.last.fm/api/account/create
   - Add your Last.fm username

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the app:
   ```bash
   python app.py
   ```

5. Open http://127.0.0.1:5000 in your browser

## Credits

- Built with [Claude Code](https://www.claude.com/product/claude-code)
- Colors from [Catppuccin](https://catppuccin.com/palette/) palette
