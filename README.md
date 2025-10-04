# Benny's Ears

A personal Last.fm dashboard showing real-time listening activity, top artists, genre evolution, and "hipster scores" based on artist popularity.
Currently hosted at https://bennymagid.com/ears/

<img width="2547" height="1870" alt="image" src="https://github.com/user-attachments/assets/65d25c8e-d2b5-4aad-ba00-425d6d2cd92a" />
<img width="2512" height="2010" alt="image" src="https://github.com/user-attachments/assets/c7560267-a977-4052-b7b9-f7c55914a940" />
<img width="2508" height="1960" alt="image" src="https://github.com/user-attachments/assets/6feabc47-2f73-4d01-bbbf-873230c29402" />

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
