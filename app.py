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

    result = {
        'artist': track['artist']['#text'],
        'name': track['name'],
        'album': track['album']['#text'],
        'image': track['image'][-1]['#text'],
        'nowPlaying': now_playing,
        'timestamp': None if now_playing else track['date']['uts'],
        'genre': genre
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

        tracks.append({
            'artist': track['artist']['#text'],
            'name': track['name'],
            'album': track['album']['#text'],
            'image': track['image'][-1]['#text'],
            'timestamp': track['date']['uts'] if 'date' in track else None,
            'genre': genre
        })

    return jsonify(tracks)

@app.route('/api/lastfm/top-artists')
def top_artists():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.gettopartists',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'period': '7day',
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

if __name__ == '__main__':
    app.run()