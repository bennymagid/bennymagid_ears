# app.py
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from flask_caching import Cache
from dotenv import load_dotenv
import requests
import os
import math

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow your static site to call this API

# Configure caching
cache_config = {
    'CACHE_TYPE': 'FileSystemCache',
    'CACHE_DIR': '/tmp/last_fm_cache',
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes default
}
app.config.from_mapping(cache_config)
cache = Cache(app)

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

    # Constants for hipster score calculation
    HIPSTER_BASE_SCORE = 140
    HIPSTER_SCALE_FACTOR = 20

    # Formula: HIPSTER_BASE_SCORE - (log10(listeners) * HIPSTER_SCALE_FACTOR)
    # This maps 10M+ listeners to 0 and 100 listeners to 100
    score = HIPSTER_BASE_SCORE - (math.log10(listeners) * HIPSTER_SCALE_FACTOR)
    return max(0, min(100, int(score)))  # Clamp between 0-100

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/lastfm/last-played')
@cache.cached(timeout=30)
def last_played():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getrecenttracks',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': 1
    }

    response = requests.get(url, params=params, timeout=10)
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
    track_info_response = requests.get(url, params=track_info_params, timeout=10)
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
        artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
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
@cache.cached(timeout=30)
def recent_tracks():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getrecenttracks',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': RECENT_TRACKS_LIMIT + 1  # Get one extra to skip the first one
    }

    response = requests.get(url, params=params, timeout=10)
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
                track_info_response = requests.get(url, params=track_info_params, timeout=10)
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
            artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
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
@cache.cached(timeout=300, query_string=True)
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

    response = requests.get(url, params=params, timeout=10)
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
        artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
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
@cache.cached(timeout=3600)
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

    response = requests.get(url, params=params, timeout=10)
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
        artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
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
@cache.cached(timeout=3600)
def weekly_chart_list():
    url = f'https://ws.audioscrobbler.com/2.0/'
    params = {
        'method': 'user.getweeklychartlist',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }

    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    # Return the chart list
    if 'weeklychartlist' in data and 'chart' in data['weeklychartlist']:
        charts = data['weeklychartlist']['chart']
        return jsonify(charts)

    return jsonify([])

@app.route('/api/lastfm/genre-profile')
@cache.cached(timeout=300, query_string=True)
def genre_profile():
    from flask import request
    from collections import Counter

    # Get periods from query parameter (comma-separated)
    periods_param = request.args.get('periods', '1month,3month')
    periods = [p.strip() for p in periods_param.split(',')]

    url = f'https://ws.audioscrobbler.com/2.0/'

    # First pass: collect all genres across all periods to find top 8 overall
    all_genres = Counter()
    period_data = {}

    for period in periods:
        # Fetch top artists for this period
        params = {
            'method': 'user.gettopartists',
            'user': LASTFM_USERNAME,
            'api_key': LASTFM_API_KEY,
            'format': 'json',
            'period': period,
            'limit': TOP_ARTISTS_WEEK_LIMIT
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        # Collect all genres with playcount weighting
        genre_counts = Counter()

        for artist in data['topartists']['artist']:
            # Fetch artist info to get genre
            artist_info_params = {
                'method': 'artist.getinfo',
                'artist': artist['name'],
                'api_key': LASTFM_API_KEY,
                'format': 'json'
            }
            artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
            artist_info = artist_info_response.json()

            # Extract top tag as genre
            genre = ''
            if 'artist' in artist_info and 'tags' in artist_info['artist'] and 'tag' in artist_info['artist']['tags']:
                tags = artist_info['artist']['tags']['tag']
                if isinstance(tags, list) and len(tags) > 0:
                    genre = tags[0]['name'].lower()
                    # Weight by playcount
                    playcount = int(artist['playcount'])
                    genre_counts[genre] += playcount
                    all_genres[genre] += playcount

        period_data[period] = genre_counts

    # Get top 8 genres overall
    top_8_genres = [genre for genre, _ in all_genres.most_common(8)]

    # Second pass: convert to percentages for each period
    result = {}
    for period in periods:
        # Calculate total plays for this period
        total_plays = sum(period_data[period].values())

        # Convert each genre to percentage of total
        if total_plays > 0:
            result[period] = {
                genre: round((period_data[period].get(genre, 0) / total_plays) * 100, 1)
                for genre in top_8_genres
            }
        else:
            result[period] = {genre: 0 for genre in top_8_genres}

    return jsonify(result)

@app.route('/api/lastfm/top-genres')
@cache.cached(timeout=300, query_string=True)
def top_genres():
    from flask import request
    from collections import Counter

    # Get period from query parameter
    period = request.args.get('period', '1month')

    url = f'https://ws.audioscrobbler.com/2.0/'

    # Fetch top artists for this period
    params = {
        'method': 'user.gettopartists',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'period': period,
        'limit': TOP_ARTISTS_WEEK_LIMIT
    }
    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    # Collect all genres with playcount weighting
    genre_counts = Counter()

    for artist in data['topartists']['artist']:
        # Fetch artist info to get genre
        artist_info_params = {
            'method': 'artist.getinfo',
            'artist': artist['name'],
            'api_key': LASTFM_API_KEY,
            'format': 'json'
        }
        artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
        artist_info = artist_info_response.json()

        # Extract top tag as genre
        if 'artist' in artist_info and 'tags' in artist_info['artist'] and 'tag' in artist_info['artist']['tags']:
            tags = artist_info['artist']['tags']['tag']
            if isinstance(tags, list) and len(tags) > 0:
                genre = tags[0]['name'].lower()
                # Weight by playcount
                genre_counts[genre] += int(artist['playcount'])

    # Get top 10 genres with raw counts
    top_10 = [{'genre': genre, 'count': count} for genre, count in genre_counts.most_common(10)]

    return jsonify(top_10)

@app.route('/api/lastfm/music-stats')
@cache.cached(timeout=300, query_string=True)
def music_stats():
    from flask import request

    # Get period from query parameter
    period = request.args.get('period', '1month')

    url = f'https://ws.audioscrobbler.com/2.0/'

    # Fetch top artists for this period (uses cache!)
    params = {
        'method': 'user.gettopartists',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'period': period,
        'limit': TOP_ARTISTS_WEEK_LIMIT
    }
    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    hipster_scores = []
    hipster_categories = {
        'Ultra Hipster': 0,
        'Underground': 0,
        'Indie': 0,
        'Popular': 0,
        'Mainstream': 0
    }
    total_plays = 0
    top_artist_plays = 0
    top_artist_name = ''

    for i, artist in enumerate(data['topartists']['artist']):
        # Fetch artist info to get listener count
        artist_info_params = {
            'method': 'artist.getinfo',
            'artist': artist['name'],
            'api_key': LASTFM_API_KEY,
            'format': 'json'
        }
        artist_info_response = requests.get(url, params=artist_info_params, timeout=10)
        artist_info = artist_info_response.json()

        listeners = int(artist_info['artist']['stats']['listeners'])
        hipster_score = calculate_hipster_score(listeners)
        hipster_scores.append(hipster_score)

        # Categorize
        if hipster_score >= 85:
            hipster_categories['Ultra Hipster'] += 1
        elif hipster_score >= 60:
            hipster_categories['Underground'] += 1
        elif hipster_score >= 35:
            hipster_categories['Indie'] += 1
        elif hipster_score >= 10:
            hipster_categories['Popular'] += 1
        else:
            hipster_categories['Mainstream'] += 1

        # Track plays
        playcount = int(artist['playcount'])
        total_plays += playcount

        if i == 0:
            top_artist_plays = playcount
            top_artist_name = artist['name']

    # Calculate stats
    avg_hipster_score = round(sum(hipster_scores) / len(hipster_scores), 1) if hipster_scores else 0
    top_artist_percentage = round((top_artist_plays / total_plays) * 100, 1) if total_plays > 0 else 0

    result = {
        'avgHipsterScore': avg_hipster_score,
        'hipsterDistribution': hipster_categories,
        'artistDiversity': {
            'topArtistPercentage': top_artist_percentage,
            'topArtistName': top_artist_name
        }
    }

    return jsonify(result)

@app.route('/api/lastfm/artist-history/<artist_name>')
@cache.cached(timeout=3600, query_string=True)
def artist_history(artist_name):
    from flask import request
    from datetime import datetime, timedelta
    from collections import defaultdict
    import time

    # Get number of weeks to fetch (default 12)
    weeks = int(request.args.get('weeks', '12'))
    aggregate = request.args.get('aggregate', 'week')

    url = f'https://ws.audioscrobbler.com/2.0/'

    # Handle daily aggregation differently
    if aggregate == 'day':
        # Fetch recent tracks and group by day
        days = weeks  # For 'day' aggregate, weeks parameter represents number of days
        now = int(time.time())
        from_timestamp = now - (days * 86400)  # 86400 seconds in a day

        # Fetch recent tracks
        recent_params = {
            'method': 'user.getrecenttracks',
            'user': LASTFM_USERNAME,
            'api_key': LASTFM_API_KEY,
            'format': 'json',
            'from': from_timestamp,
            'limit': 1000  # Max limit
        }

        response = requests.get(url, params=recent_params, timeout=10)
        data = response.json()

        # Group tracks by day and count plays per artist
        daily_counts = defaultdict(int)

        if 'recenttracks' in data and 'track' in data['recenttracks']:
            tracks = data['recenttracks']['track']
            if not isinstance(tracks, list):
                tracks = [tracks]

            for track in tracks:
                # Skip if currently playing
                if '@attr' in track and track['@attr'].get('nowplaying') == 'true':
                    continue

                # Skip if no date
                if 'date' not in track:
                    continue

                # Get artist name
                track_artist = track['artist']['#text'] if isinstance(track['artist'], dict) else track['artist']

                # Only count if it's the artist we're looking for
                if track_artist.lower() == artist_name.lower():
                    timestamp = int(track['date']['uts'])
                    # Get day (midnight timestamp)
                    dt = datetime.fromtimestamp(timestamp)
                    day_start = datetime(dt.year, dt.month, dt.day)
                    day_timestamp = int(day_start.timestamp())

                    daily_counts[day_timestamp] += 1

        # Create result for last N days (even if no plays)
        history = []
        for i in range(days):
            day_offset = now - (i * 86400)
            dt = datetime.fromtimestamp(day_offset)
            day_start = datetime(dt.year, dt.month, dt.day)
            day_timestamp = int(day_start.timestamp())

            history.append({
                'week_start': day_timestamp,
                'week_end': day_timestamp,
                'playcount': daily_counts.get(day_timestamp, 0)
            })

        # Reverse to get chronological order
        history.reverse()
        return jsonify(history)

    # Original weekly/monthly aggregation logic
    # First, get the weekly chart list
    chart_params = {
        'method': 'user.getweeklychartlist',
        'user': LASTFM_USERNAME,
        'api_key': LASTFM_API_KEY,
        'format': 'json'
    }

    chart_response = requests.get(url, params=chart_params, timeout=10)
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

        artist_response = requests.get(url, params=artist_params, timeout=10)
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

    # Add current incomplete week/month if not included
    if len(history) > 0:
        last_week_end = int(history[-1]['week_end'])
        now = int(time.time())

        # If there's a gap, fetch plays from the end of last week to now
        if now > last_week_end:
            recent_params = {
                'method': 'user.getrecenttracks',
                'user': LASTFM_USERNAME,
                'api_key': LASTFM_API_KEY,
                'format': 'json',
                'from': last_week_end,
                'to': now,
                'limit': 1000
            }

            recent_response = requests.get(url, params=recent_params, timeout=10)
            recent_data = recent_response.json()

            # Count plays for this artist in the current period
            current_playcount = 0
            if 'recenttracks' in recent_data and 'track' in recent_data['recenttracks']:
                tracks = recent_data['recenttracks']['track']
                if not isinstance(tracks, list):
                    tracks = [tracks]

                for track in tracks:
                    if '@attr' in track and track['@attr'].get('nowplaying') == 'true':
                        continue
                    if 'date' not in track:
                        continue

                    track_artist = track['artist']['#text'] if isinstance(track['artist'], dict) else track['artist']
                    if track_artist.lower() == artist_name.lower():
                        current_playcount += 1

            # Append current period
            history.append({
                'week_start': str(last_week_end),
                'week_end': str(now),
                'playcount': current_playcount
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