function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function getHipsterLabel(score) {
    if (score >= 80) return '🎸 Ultra Hipster';
    if (score >= 60) return '🎭 Underground';
    if (score >= 40) return '🎪 Indie';
    if (score >= 20) return '📻 Popular';
    return '🔥 Mainstream';
}

function getHipsterColor(score) {
    // Catppuccin Mocha colors
    if (score >= 80) return '#cba6f7'; // mauve
    if (score >= 60) return '#b4befe'; // lavender
    if (score >= 40) return '#89dceb'; // sky
    if (score >= 20) return '#89b4fa'; // blue
    return '#a6e3a1'; // green
}

async function loadLastPlayed() {
    try {
        const response = await fetch('api/lastfm/last-played');
        const track = await response.json();

        const container = document.getElementById('last-played');
        const status = track.nowPlaying ?
            '<span class="now-playing-badge">🎵 NOW PLAYING</span>' :
            `<span class="last-played-time">Played ${getTimeAgo(track.timestamp)}</span>`;

        container.innerHTML = `
            <div class="hero-content">
                <img src="${track.image || 'https://via.placeholder.com/300'}"
                     alt="${track.name}"
                     class="hero-album-art">
                <div class="hero-info">
                    ${status}
                    <h2 class="hero-track-name">${track.name}</h2>
                    <p class="hero-artist-name">${track.artist}</p>
                    <p class="hero-album-name">${track.album}</p>
                    ${track.genre ? `<p class="hero-genre">🎵 ${track.genre}</p>` : ''}
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('last-played').innerHTML =
            '<div class="error">Failed to load current track.</div>';
        console.error('Error loading last played:', error);
    }
}

async function loadTracks() {
    try {
        const response = await fetch('api/lastfm/recent-tracks');
        const tracks = await response.json();

        const tracksContainer = document.getElementById('tracks');
        tracksContainer.innerHTML = tracks.map(track => `
            <div class="track-card">
                ${track.timestamp ? `<div class="track-timestamp">${getTimeAgo(track.timestamp)}</div>` : ''}
                <img src="${track.image || 'https://via.placeholder.com/300'}"
                     alt="${track.name}"
                     class="album-art">
                <div class="track-info">
                    <h2 class="track-name">${track.name}</h2>
                    <p class="artist-name">${track.artist}</p>
                    <p class="album-name">${track.album}</p>
                    ${track.genre ? `<p class="genre-tag">🎵 ${track.genre}</p>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('tracks').innerHTML =
            '<div class="error">Failed to load tracks. Please try again.</div>';
        console.error('Error loading tracks:', error);
    }
}

async function loadTopArtists() {
    try {
        const response = await fetch('api/lastfm/top-artists');
        const artists = await response.json();

        const artistsContainer = document.getElementById('top-artists');
        artistsContainer.innerHTML = artists.map((artist, index) => `
            <div class="artist-item">
                <div class="artist-rank">#${index + 1}</div>
                <div class="artist-details">
                    <h3 class="artist-name">${artist.name}</h3>
                    <p class="artist-playcount">${artist.playcount} plays • ${artist.listeners.toLocaleString()} listeners</p>
                    ${artist.genre ? `<p class="artist-genre">🎵 ${artist.genre}</p>` : ''}
                </div>
                <div class="hipster-badge" style="background-color: ${getHipsterColor(artist.hipsterScore)}">
                    ${getHipsterLabel(artist.hipsterScore)}
                    <div class="hipster-score">${artist.hipsterScore}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('top-artists').innerHTML =
            '<div class="error">Failed to load top artists. Please try again.</div>';
        console.error('Error loading top artists:', error);
    }
}

async function loadTopArtistsYear() {
    try {
        const response = await fetch('api/lastfm/top-artists-year');
        const artists = await response.json();

        const artistsContainer = document.getElementById('top-artists-year');
        artistsContainer.innerHTML = artists.map((artist, index) => `
            <div class="artist-item">
                <div class="artist-rank">#${index + 1}</div>
                <div class="artist-details">
                    <h3 class="artist-name">${artist.name}</h3>
                    <p class="artist-playcount">${artist.playcount} plays • ${artist.listeners.toLocaleString()} listeners</p>
                    ${artist.genre ? `<p class="artist-genre">🎵 ${artist.genre}</p>` : ''}
                </div>
                <div class="hipster-badge" style="background-color: ${getHipsterColor(artist.hipsterScore)}">
                    ${getHipsterLabel(artist.hipsterScore)}
                    <div class="hipster-score">${artist.hipsterScore}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('top-artists-year').innerHTML =
            '<div class="error">Failed to load yearly top artists. Please try again.</div>';
        console.error('Error loading yearly top artists:', error);
    }
}

// Load data on page load
loadLastPlayed();
loadTracks();
loadTopArtists();
loadTopArtistsYear();

// Auto-refresh every 30 seconds
setInterval(() => {
    loadLastPlayed();
    loadTracks();
    loadTopArtists();
    loadTopArtistsYear();
}, 30000);
