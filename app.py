# app.py
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import os
import math

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow your static site to call this API

LASTFM_API_KEY = os.getenv('LASTFM_API_KEY')
LASTFM_USERNAME = os.getenv('LASTFM_USERNAME')

# Display configuration with defaults
RECENT_TRACKS_LIMIT = int(os.getenv('RECENT_TRACKS_LIMIT', '10'))
TOP_ARTISTS_WEEK_LIMIT = int(os.getenv('TOP_ARTISTS_WEEK_LIMIT', '10'))
TOP_ARTISTS_YEAR_LIMIT = int(os.getenv('TOP_ARTISTS_YEAR_LIMIT', '10'))
SHOW_RECENT_TRACKS_GENRES = os.getenv('SHOW_RECENT_TRACKS_GENRES', 'true').lower() == 'true'

def calculate_hipster_score(listeners):
    """Calculate hipster score (0-100) based on listener count.
    Lower listeners = higher hipster score"""
    if listeners == 0:
        return 100

    # Use log scale: 100M listeners = ~0, 1K listeners = ~100
    # Formula: 100 - (log10(listeners) * 12.5)
    # Adjusted so: 100M = 0, 10M = 12.5, 1M = 25, 100K = 37.5, 10K = 50, 1K = 62.5, 100 = 75, 10 = 87.5
    score = 100 - (math.log10(listeners) * 12.5)
    return max(0, min(100, int(score)))  # Clamp between 0-100

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/lastfm/last-played')
def last_played():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getrecenttracks',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': 1
    }

    response = requests.get(url, params=params)
    data = response.json()

    track = data['recenttracks']['track'][0]

    # Check if currently playing
    now_playing = '@attr' in track and track['@attr'].get('nowplaying') == 'true'

    # Fetch track info to get tags/genres
    track_info_params = {
        'method': 'track.getinfo',
        'artist': track['artist']['#text'],
        'track': track['name'],
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }
    track_info_response = requests.get(url, params=track_info_params)
    track_info = track_info_response.json()

    # Extract top tag as genre
    genre = ''
    if 'track' in track_info and 'toptags' in track_info['track'] and 'tag' in track_info['track']['toptags']:
        tags = track_info['track']['toptags']['tag']
        if isinstance(tags, list) and len(tags) > 0:
            genre = tags[0]['name'].lower()

    # Build Last.fm URLs
    artist_name = track['artist']['#text']
    track_name = track['name']
    artist_url = f"https://www.last.fm/music/{requests.utils.quote(artist_name)}"
    track_url = f"https://www.last.fm/music/{requests.utils.quote(artist_name)}/_/{requests.utils.quote(track_name)}"

    # Fetch artist info for hipster score
    hipster_score = 0
    listeners = 0
    try:
        artist_info_params = {
            'method': 'artist.getinfo',
            'artist': artist_name,
            'api_key': LASTFM_API_KEY,
            'format': 'json'
        }
        artist_info_response = requests.get(url, params=artist_info_params)
        artist_info = artist_info_response.json()

        if 'artist' in artist_info and 'stats' in artist_info['artist']:
            listeners = int(artist_info['artist']['stats']['listeners'])
            hipster_score = calculate_hipster_score(listeners)
    except Exception as e:
        print(f"Error fetching artist info for {artist_name}: {str(e)}")

    result = {
        'artist': artist_name,
        'name': track_name,
        'album': track['album']['#text'],
        'image': track['image'][-1]['#text'],
        'nowPlaying': now_playing,
        'timestamp': None if now_playing else track['date']['uts'],
        'genre': genre,
        'artistUrl': artist_url,
        'trackUrl': track_url,
        'listeners': listeners,
        'hipsterScore': hipster_score
    }

    return jsonify(result)

@app.route('/api/lastfm/recent-tracks')
def recent_tracks():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getrecenttracks',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': RECENT_TRACKS_LIMIT + 1  # Get one extra to skip the first one
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Process/simplify the data, skip first track (it's in hero section)
    tracks = []
    track_list = data['recenttracks']['track']

    # Skip first track
    for i, track in enumerate(track_list):
        if i == 0:
            continue

        # Check if track has timestamp (not currently playing)
        if '@attr' in track and track['@attr'].get('nowplaying') == 'true':
            continue

        # Fetch track info to get tags/genres (if enabled)
        genre = ''
        if SHOW_RECENT_TRACKS_GENRES:
            try:
                track_info_params = {
                    'method': 'track.getinfo',
                    'artist': track['artist']['#text'],
                    'track': track['name'],
                    'api_key': LASTFM_API_KEY,
                    'format': 'json'
                }
                track_info_response = requests.get(url, params=track_info_params)
                track_info = track_info_response.json()

                # Extract top tag as genre
                if 'track' in track_info and 'toptags' in track_info['track'] and 'tag' in track_info['track']['toptags']:
                    tags = track_info['track']['toptags']['tag']
                    if isinstance(tags, list) and len(tags) > 0:
                        genre = tags[0]['name'].lower()
                    elif isinstance(tags, dict):
                        # Handle case where single tag is returned as dict
                        genre = tags['name'].lower()
            except Exception as e:
                print(f"Error fetching genre for {track['artist']['#text']} - {track['name']}: {str(e)}")

        # Build Last.fm URLs
        artist_name = track['artist']['#text']
        track_name = track['name']
        artist_url = f"https://www.last.fm/music/{requests.utils.quote(artist_name)}"
        track_url = f"https://www.last.fm/music/{requests.utils.quote(artist_name)}/_/{requests.utils.quote(track_name)}"

        # Fetch artist info for hipster score
        hipster_score = 0
        listeners = 0
        try:
            artist_info_params = {
                'method': 'artist.getinfo',
                'artist': artist_name,
                'api_key': LASTFM_API_KEY,
                'format': 'json'
            }
            artist_info_response = requests.get(url, params=artist_info_params)
            artist_info = artist_info_response.json()

            if 'artist' in artist_info and 'stats' in artist_info['artist']:
                listeners = int(artist_info['artist']['stats']['listeners'])
                hipster_score = calculate_hipster_score(listeners)
        except Exception as e:
            print(f"Error fetching artist info for {artist_name}: {str(e)}")

        tracks.append({
            'artist': artist_name,
            'name': track_name,
            'album': track['album']['#text'],
            'image': track['image'][-1]['#text'],
            'timestamp': track['date']['uts'] if 'date' in track else None,
            'genre': genre,
            'artistUrl': artist_url,
            'trackUrl': track_url,
            'listeners': listeners,
            'hipsterScore': hipster_score
        })

    return jsonify(tracks)

@app.route('/api/lastfm/top-artists')
def top_artists():
    # Get period from query parameter, default to 7day
    from flask import request
    period = request.args.get('period', '7day')

    # Validate period
    valid_periods = ['7day', '1month', '3month', '6month', '12month', 'overall']
    if period not in valid_periods:
        period = '7day'

    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.gettopartists',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'period': period,
        'limit': TOP_ARTISTS_WEEK_LIMIT
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Process/simplify the data and fetch artist info for hipster score
    artists = []
    for artist in data['topartists']['artist']:
        # Fetch artist info to get listener count
        artist_info_params = {
            'method': 'artist.getinfo',
            'artist': artist['name'],
            'api_key': LASTFM_API_KEY,
            'format': 'json'
        }
        artist_info_response = requests.get(url, params=artist_info_params)
        artist_info = artist_info_response.json()

        listeners = int(artist_info['artist']['stats']['listeners'])
        hipster_score = calculate_hipster_score(listeners)

        # Extract top tag as genre
        genre = ''
        if 'tags' in artist_info['artist'] and 'tag' in artist_info['artist']['tags']:
            tags = artist_info['artist']['tags']['tag']
            if isinstance(tags, list) and len(tags) > 0:
                genre = tags[0]['name'].lower()

        artists.append({
            'name': artist['name'],
            'playcount': artist['playcount'],
            'url': artist['url'],
            'image': artist['image'][-1]['#text'] if artist['image'] else '',
            'listeners': listeners,
            'hipsterScore': hipster_score,
            'genre': genre
        })

    return jsonify(artists)

@app.route('/api/lastfm/top-artists-year')
def top_artists_year():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.gettopartists',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'period': '12month',
        'limit': TOP_ARTISTS_YEAR_LIMIT
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Process/simplify the data and fetch artist info for hipster score
    artists = []
    for artist in data['topartists']['artist']:
        # Fetch artist info to get listener count
        artist_info_params = {
            'method': 'artist.getinfo',
            'artist': artist['name'],
            'api_key': LASTFM_API_KEY,
            'format': 'json'
        }
        artist_info_response = requests.get(url, params=artist_info_params)
        artist_info = artist_info_response.json()

        listeners = int(artist_info['artist']['stats']['listeners'])
        hipster_score = calculate_hipster_score(listeners)

        # Extract top tag as genre
        genre = ''
        if 'tags' in artist_info['artist'] and 'tag' in artist_info['artist']['tags']:
            tags = artist_info['artist']['tags']['tag']
            if isinstance(tags, list) and len(tags) > 0:
                genre = tags[0]['name'].lower()

        artists.append({
            'name': artist['name'],
            'playcount': artist['playcount'],
            'url': artist['url'],
            'image': artist['image'][-1]['#text'] if artist['image'] else '',
            'listeners': listeners,
            'hipsterScore': hipster_score,
            'genre': genre
        })

    return jsonify(artists)

@app.route('/api/lastfm/weekly-chart-list')
def weekly_chart_list():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getweeklychartlist',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Return the chart list
    if 'weeklychartlist' in data and 'chart' in data['weeklychartlist']:
        charts = data['weeklychartlist']['chart']
        return jsonify(charts)

    return jsonify([])

@app.route('/api/lastfm/artist-history/<artist_name>')
def artist_history(artist_name):
    from flask import request
    from datetime import datetime
    from collections import defaultdict

    # Get number of weeks to fetch (default 12)
    weeks = int(request.args.get('weeks', '12'))
    aggregate = request.args.get('aggregate', 'week')

    # First, get the weekly chart list
    url = f'https://ws.audioscrobbler.com/2.0/'
    chart_params = {
        'method': 'user.getweeklychartlist',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }

    chart_response = requests.get(url, params=chart_params)
    chart_data = chart_response.json()

    if 'weeklychartlist' not in chart_data or 'chart' not in chart_data['weeklychartlist']:
        return jsonify([])

    charts = chart_data['weeklychartlist']['chart']

    # Get the last N weeks
    recent_charts = charts[-weeks:] if len(charts) > weeks else charts

    # Fetch artist data for each week
    history = []
    for chart in recent_charts:
        artist_params = {
            'method': 'user.getweeklyartistchart',
            'user': LASTFM_USERNAME,
            'api_key': LASTFM_API_KEY,
            'format': 'json',
            'from': chart['from'],
            'to': chart['to']
        }

        artist_response = requests.get(url, params=artist_params)
        artist_data = artist_response.json()

        # Find the specific artist in this week's chart
        playcount = 0
        if 'weeklyartistchart' in artist_data and 'artist' in artist_data['weeklyartistchart']:
            for artist in artist_data['weeklyartistchart']['artist']:
                if artist['name'].lower() == artist_name.lower():
                    playcount = int(artist['playcount'])
                    break

        history.append({
            'week_start': chart['from'],
            'week_end': chart['to'],
            'playcount': playcount
        })

    # Aggregate by month if requested
    if aggregate == 'month':
        monthly_data = defaultdict(int)
        monthly_timestamps = {}

        for week in history:
            # Get month from timestamp
            dt = datetime.fromtimestamp(int(week['week_start']))
            month_key = f"{dt.year}-{dt.month:02d}"
            monthly_data[month_key] += week['playcount']

            # Keep earliest timestamp for each month
            if month_key not in monthly_timestamps:
                monthly_timestamps[month_key] = week['week_start']

        # Convert back to list format
        history = [
            {
                'week_start': monthly_timestamps[month],
                'week_end': monthly_timestamps[month],
                'playcount': count
            }
            for month, count in sorted(monthly_data.items())
        ]

    return jsonify(history)

if __name__ == '__main__':
    app.run()