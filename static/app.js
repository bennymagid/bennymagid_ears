function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function getHipsterLabel(score) {
    if (score >= 48) return '🎸 Ultra Hipster';
    if (score >= 42) return '🎭 Underground';
    if (score >= 35) return '🎪 Indie';
    if (score >= 20) return '📻 Popular';
    return '🔥 Mainstream';
}

function getHipsterColor(score) {
    // Catppuccin Mocha colors
    if (score >= 48) return '#cba6f7'; // mauve
    if (score >= 42) return '#b4befe'; // lavender
    if (score >= 35) return '#89dceb'; // sky
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
            <a href="${track.trackUrl}" target="_blank" rel="noopener noreferrer" class="hero-link">
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
                        ${track.hipsterScore !== undefined ? `
                            <div class="hero-hipster-badge" style="background-color: ${getHipsterColor(track.hipsterScore)}">
                                ${getHipsterLabel(track.hipsterScore)}
                            </div>
                        ` : ''}
                        </div>
                </div>
            </a>
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
            <a href="${track.trackUrl}" target="_blank" rel="noopener noreferrer" class="track-link">
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
                        ${track.hipsterScore !== undefined ? `
                            <div class="track-hipster-badge" style="background-color: ${getHipsterColor(track.hipsterScore)}">
                                ${getHipsterLabel(track.hipsterScore)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </a>
        `).join('');
    } catch (error) {
        document.getElementById('tracks').innerHTML =
            '<div class="error">Failed to load tracks. Please try again.</div>';
        console.error('Error loading tracks:', error);
    }
}

async function loadTopArtists(period = '7day') {
    try {
        const response = await fetch(`api/lastfm/top-artists?period=${period}`);
        const artists = await response.json();

        const artistsContainer = document.getElementById('top-artists');
        artistsContainer.innerHTML = artists.map((artist, index) => `
            <div class="artist-item" data-artist-name="${artist.name}" data-period="${period}">
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

        // Add click event listeners to artist items
        document.querySelectorAll('.artist-item').forEach(item => {
            item.addEventListener('click', () => {
                const artistName = item.getAttribute('data-artist-name');
                const period = item.getAttribute('data-period');
                toggleArtistInChart(artistName, period);
            });
        });

        return artists;
    } catch (error) {
        document.getElementById('top-artists').innerHTML =
            '<div class="error">Failed to load top artists. Please try again.</div>';
        console.error('Error loading top artists:', error);
        return [];
    }
}

let artistChart = null;
let chartArtists = []; // Track which artists are currently in the chart
let chartLabels = null;
let currentPeriod = '7day';

// Catppuccin color palette for chart lines
const chartColors = [
    { border: '#cba6f7', bg: 'rgba(203, 166, 247, 0.1)' }, // mauve
    { border: '#89b4fa', bg: 'rgba(137, 180, 250, 0.1)' }, // blue
    { border: '#a6e3a1', bg: 'rgba(166, 227, 161, 0.1)' }, // green
    { border: '#fab387', bg: 'rgba(250, 179, 135, 0.1)' }, // peach
    { border: '#f5c2e7', bg: 'rgba(245, 194, 231, 0.1)' }, // pink
    { border: '#89dceb', bg: 'rgba(137, 220, 235, 0.1)' }, // sky
    { border: '#f9e2af', bg: 'rgba(249, 226, 175, 0.1)' }, // yellow
    { border: '#94e2d5', bg: 'rgba(148, 226, 213, 0.1)' }, // teal
    { border: '#b4befe', bg: 'rgba(180, 190, 254, 0.1)' }, // lavender
    { border: '#f38ba8', bg: 'rgba(243, 139, 168, 0.1)' }  // red
];

function getWeeksForPeriod(period) {
    const periodConfig = {
        '7day': { weeks: 1, aggregate: 'week' },
        '1month': { weeks: 4, aggregate: 'week' },
        '3month': { weeks: 12, aggregate: 'week' },
        '6month': { weeks: 24, aggregate: 'month' },
        '12month': { weeks: 52, aggregate: 'month' },
        'overall': { weeks: 52, aggregate: 'month' }
    };
    return periodConfig[period] || { weeks: 12, aggregate: 'week' };
}

function initializeChart() {
    const ctx = document.getElementById('artist-chart').getContext('2d');
    artistChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#cdd6f4'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#cdd6f4',
                        stepSize: 1
                    },
                    grid: {
                        color: '#45475a'
                    }
                },
                x: {
                    ticks: {
                        color: '#cdd6f4'
                    },
                    grid: {
                        color: '#45475a'
                    }
                }
            }
        }
    });
}

async function toggleArtistInChart(artistName, period) {
    // Check if artist is already in chart
    const existingIndex = chartArtists.findIndex(a => a.name === artistName);

    if (existingIndex !== -1) {
        // Remove artist from chart
        chartArtists.splice(existingIndex, 1);
        artistChart.data.datasets.splice(existingIndex, 1);
        artistChart.update();
        return;
    }

    // Add artist to chart
    const loadingElement = document.getElementById('chart-loading');
    try {
        // Show loading indicator
        loadingElement.textContent = `Loading ${artistName}...`;
        loadingElement.style.display = 'block';

        const config = getWeeksForPeriod(period);
        const historyResponse = await fetch(`api/lastfm/artist-history/${encodeURIComponent(artistName)}?weeks=${config.weeks}&aggregate=${config.aggregate}`);
        const history = await historyResponse.json();

        // Set labels if this is the first artist
        if (chartArtists.length === 0) {
            chartLabels = history.map(week => {
                const date = new Date(parseInt(week.week_start) * 1000);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            artistChart.data.labels = chartLabels;
        }

        // Calculate cumulative plays
        let cumulative = 0;
        const data = history.map(week => {
            cumulative += week.playcount;
            return cumulative;
        });

        const color = chartColors[chartArtists.length % chartColors.length];

        chartArtists.push({ name: artistName, period: period });

        artistChart.data.datasets.push({
            label: `${artistName}`,
            data: data,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0.4,
            fill: true
        });

        artistChart.update();
    } catch (error) {
        console.error('Error toggling artist in chart:', error);
    } finally {
        // Hide loading indicator
        loadingElement.style.display = 'none';
    }
}


// Load data on page load
(async () => {
    loadLastPlayed();
    loadTracks();
    const artists = await loadTopArtists();
    initializeChart();

    // Auto-load first artist
    if (artists.length > 0) {
        toggleArtistInChart(artists[0].name, '7day');
    }
})();

// Add event listener for period selector
document.getElementById('period-selector').addEventListener('change', async (e) => {
    currentPeriod = e.target.value;
    const artists = await loadTopArtists(e.target.value);

    // Clear chart when period changes
    chartArtists = [];
    artistChart.data.datasets = [];
    artistChart.data.labels = [];
    chartLabels = null;
    artistChart.update();

    // Auto-load first artist for new period
    if (artists.length > 0) {
        toggleArtistInChart(artists[0].name, e.target.value);
    }
});

// Add event listener for collapsible section
document.getElementById('recently-played-toggle').addEventListener('click', () => {
    const tracksGrid = document.getElementById('tracks');
    const collapseIcon = document.querySelector('.collapse-icon');

    tracksGrid.classList.toggle('collapsed');
    collapseIcon.classList.toggle('collapsed');
});

// Auto-refresh every 30 seconds
setInterval(() => {
    loadLastPlayed();
    loadTracks();
    const selectedPeriod = document.getElementById('period-selector').value;
    loadTopArtists(selectedPeriod);
}, 30000);
