// Hipster score calculation constants
const HIPSTER_BASE_SCORE = 140;
const HIPSTER_SCALE_FACTOR = 20;

// Global artist distribution (approximate, based on Last.fm power law)
const GLOBAL_ARTIST_DISTRIBUTION = {
    'Mainstream': 2,      // ~2% of artists (>10M listeners)
    'Popular': 6,         // ~6% (1M-10M listeners)
    'Indie': 17,          // ~17% (10K-1M listeners)
    'Underground': 28,    // ~28% (100-10K listeners)
    'Ultra Hipster': 47   // ~47% (<100 listeners)
};

function getHipsterColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    if (theme === 'light') {
        return {
            'Ultra Hipster': '#8839ef',   // mauve (Latte)
            'Underground': '#7287fd',      // lavender (Latte)
            'Indie': '#ea76cb',            // pink (Latte)
            'Popular': '#1e66f5',          // blue (Latte)
            'Mainstream': '#40a02b'        // green (Latte)
        };
    }

    return {
        'Ultra Hipster': '#cba6f7',   // mauve (Mocha)
        'Underground': '#b4befe',      // lavender (Mocha)
        'Indie': '#f5c2e7',            // pink (Mocha)
        'Popular': '#89b4fa',          // blue (Mocha)
        'Mainstream': '#a6e3a1'        // green (Mocha)
    };
}

function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function getHipsterLabel(score) {
    if (score >= 85) return '🎸 Ultra Hipster';
    if (score >= 60) return '🎭 Underground';
    if (score >= 35) return '🎪 Indie';
    if (score >= 10) return '📻 Popular';
    return '🔥 Mainstream';
}

function getHipsterCutoffs() {
    return [
        { emoji: '🔥', label: 'Mainstream', range: '<10' },
        { emoji: '📻', label: 'Popular', range: '10-35' },
        { emoji: '🎪', label: 'Indie', range: '35-60' },
        { emoji: '🎭', label: 'Underground', range: '60-85' },
        { emoji: '🎸', label: 'Ultra Hipster', range: '85+' }
    ];
}

function getHipsterColor(score) {
    const colors = getHipsterColors();

    if (score >= 85) return colors['Ultra Hipster'];
    if (score >= 60) return colors['Underground'];
    if (score >= 35) return colors['Indie'];
    if (score >= 10) return colors['Popular'];
    return colors['Mainstream'];
}

function scoreToListeners(score) {
    // Reverse the formula: Score = HIPSTER_BASE_SCORE - (log10(listeners) * HIPSTER_SCALE_FACTOR)
    // So: listeners = 10^((HIPSTER_BASE_SCORE - Score) / HIPSTER_SCALE_FACTOR)
    return Math.pow(10, (HIPSTER_BASE_SCORE - score) / HIPSTER_SCALE_FACTOR);
}

function formatListeners(count) {
    if (count >= 1e9) return (count / 1e9).toFixed(0) + 'B';
    if (count >= 1e6) return (count / 1e6).toFixed(0) + 'M';
    if (count >= 1e3) return (count / 1e3).toFixed(0) + 'K';
    return Math.round(count).toString();
}

function parseScoreRange(rangeStr) {
    // Parse strings like '<20', '20-35', '48+'
    // Returns { min, max } with null for unbounded
    if (rangeStr.startsWith('<')) {
        return { min: null, max: parseInt(rangeStr.substring(1)) };
    } else if (rangeStr.endsWith('+')) {
        return { min: parseInt(rangeStr.slice(0, -1)), max: null };
    } else if (rangeStr.includes('-')) {
        const [min, max] = rangeStr.split('-').map(s => parseInt(s));
        return { min, max };
    }
    return { min: null, max: null };
}

function generateHipsterExplanation() {
    const cutoffs = getHipsterCutoffs();

    const explanation = `
        <p class="explanation-intro">
            The Hipster Score measures how obscure an artist is based on their global listener count on Last.fm.
            The score ranges from 0 to 100, where higher scores indicate more obscure (hipster) artists.
        </p>

        <div class="explanation-formula">
            <h3>Formula</h3>
            <p><code>Score = ${HIPSTER_BASE_SCORE} - (log<sub>10</sub>(listeners) × ${HIPSTER_SCALE_FACTOR})</code></p>
            <p class="formula-note">
                This logarithmic scale means that each 10x increase in listeners decreases the score by ${HIPSTER_SCALE_FACTOR} points.
            </p>
        </div>

        <div class="explanation-visualization">
            <h3>Score Visualization</h3>
            <div class="chart-container-formula">
                <canvas id="score-formula-chart"></canvas>
            </div>
            <p class="chart-note">Category boundaries are marked on the horizontal axis with labeled tick marks.</p>
        </div>

        <div class="explanation-distribution">
            <h3>Global Artist Distribution - still a work in progress</h3>
            <p class="distribution-note">
                Approximate distribution of artists on Last.fm based on a <a href="https://en.wikipedia.org/wiki/Power_law" target="_blank" rel="noopener noreferrer">power law</a> pattern.
                In a power law distribution, a small percentage of artists have the vast majority of listeners, while most artists have relatively few listeners. I'm sure there's a proper data source for this, but I don't have it yet.
                These percentages are estimated based on typical music industry patterns:
            </p>
            <div class="distribution-bars">
                ${Object.entries(GLOBAL_ARTIST_DISTRIBUTION).reverse().map(([category, percentage]) => {
                    const cutoff = cutoffs.find(c => c.label === category);
                    const emoji = cutoff ? cutoff.emoji : '';
                    const color = getHipsterColor(category === 'Ultra Hipster' ? 90 :
                                                   category === 'Underground' ? 70 :
                                                   category === 'Indie' ? 45 :
                                                   category === 'Popular' ? 20 : 5);
                    return `
                        <div class="distribution-bar-container">
                            <div class="distribution-label">
                                <span class="distribution-emoji">${emoji}</span>
                                <span class="distribution-category">${category}</span>
                            </div>
                            <div class="distribution-bar-wrapper">
                                <div class="distribution-bar" style="width: ${percentage}%; background-color: ${color};"></div>
                                <span class="distribution-percentage">${percentage}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="explanation-categories">
            <h3>Categories</h3>
            <div class="category-list">
                ${cutoffs.map(c => {
                    const scoreRange = parseScoreRange(c.range);
                    let listenerRange;

                    if (scoreRange.min === null && scoreRange.max !== null) {
                        // <X format (e.g., <20)
                        const maxListeners = scoreToListeners(scoreRange.max);
                        listenerRange = `>${formatListeners(maxListeners)}`;
                    } else if (scoreRange.max === null && scoreRange.min !== null) {
                        // X+ format (e.g., 48+)
                        const minListeners = scoreToListeners(scoreRange.min);
                        listenerRange = `<${formatListeners(minListeners)}`;
                    } else if (scoreRange.min !== null && scoreRange.max !== null) {
                        // X-Y format (e.g., 20-35)
                        const minListeners = scoreToListeners(scoreRange.max); // Note: reversed because higher score = lower listeners
                        const maxListeners = scoreToListeners(scoreRange.min);
                        listenerRange = `${formatListeners(minListeners)} - ${formatListeners(maxListeners)}`;
                    } else {
                        listenerRange = 'N/A';
                    }

                    return `
                        <div class="category-item">
                            <span class="category-emoji">${c.emoji}</span>
                            <div class="category-info">
                                <span class="category-name">${c.label}</span>
                                <span class="category-range">Score: ${c.range}</span>
                                <span class="category-listeners">Listeners: ${listenerRange}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="explanation-examples">
            <h3>Example Listener Counts</h3>
            <ul>
                ${[100000000, 1000000, 100000, 10000, 1000, 100].map(listeners => {
                    const rawScore = HIPSTER_BASE_SCORE - (Math.log10(listeners) * HIPSTER_SCALE_FACTOR);
                    const score = Math.max(0, Math.min(100, rawScore));
                    const formattedScore = score.toFixed(0);
                    return `<li><strong>${formatListeners(listeners)} listeners:</strong> Score ~${formattedScore}</li>`;
                }).join('')}
            </ul>
        </div>
    `;

    document.getElementById('hipster-explanation').innerHTML = explanation;
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
        artistsContainer.innerHTML = artists.map((artist, index) => {
            const content = `
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
            `;

            if (artist.url) {
                return `<a href="${artist.url}" target="_blank" rel="noopener noreferrer" class="artist-item">${content}</a>`;
            } else {
                return `<div class="artist-item">${content}</div>`;
            }
        }).join('');

        // Load history for these artists
        loadArtistHistory(artists, period);

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
let currentPeriod = '1month';
const artistHistoryCache = {}; // Cache by period

let genreChart = null;
let genreBarChart = null;
let hipsterDonutChart = null;

// Catppuccin color palette for chart lines
function getChartColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    if (theme === 'light') {
        return [
            { border: '#8839ef', bg: 'rgba(136, 57, 239, 0.1)' },  // mauve (Latte)
            { border: '#1e66f5', bg: 'rgba(30, 102, 245, 0.1)' },  // blue (Latte)
            { border: '#40a02b', bg: 'rgba(64, 160, 43, 0.1)' },   // green (Latte)
            { border: '#fe640b', bg: 'rgba(254, 100, 11, 0.1)' },  // peach (Latte)
            { border: '#ea76cb', bg: 'rgba(234, 118, 203, 0.1)' }, // pink (Latte)
            { border: '#04a5e5', bg: 'rgba(4, 165, 229, 0.1)' },   // sky (Latte)
            { border: '#df8e1d', bg: 'rgba(223, 142, 29, 0.1)' },  // yellow (Latte)
            { border: '#179299', bg: 'rgba(23, 146, 153, 0.1)' },  // teal (Latte)
            { border: '#7287fd', bg: 'rgba(114, 135, 253, 0.1)' }, // lavender (Latte)
            { border: '#d20f39', bg: 'rgba(210, 15, 57, 0.1)' }    // red (Latte)
        ];
    }

    return [
        { border: '#cba6f7', bg: 'rgba(203, 166, 247, 0.1)' }, // mauve (Mocha)
        { border: '#89b4fa', bg: 'rgba(137, 180, 250, 0.1)' }, // blue (Mocha)
        { border: '#a6e3a1', bg: 'rgba(166, 227, 161, 0.1)' }, // green (Mocha)
        { border: '#fab387', bg: 'rgba(250, 179, 135, 0.1)' }, // peach (Mocha)
        { border: '#f5c2e7', bg: 'rgba(245, 194, 231, 0.1)' }, // pink (Mocha)
        { border: '#89dceb', bg: 'rgba(137, 220, 235, 0.1)' }, // sky (Mocha)
        { border: '#f9e2af', bg: 'rgba(249, 226, 175, 0.1)' }, // yellow (Mocha)
        { border: '#94e2d5', bg: 'rgba(148, 226, 213, 0.1)' }, // teal (Mocha)
        { border: '#b4befe', bg: 'rgba(180, 190, 254, 0.1)' }, // lavender (Mocha)
        { border: '#f38ba8', bg: 'rgba(243, 139, 168, 0.1)' }  // red (Mocha)
    ];
}

function getWeeksForPeriod(period) {
    const periodConfig = {
        '7day': { weeks: 7, aggregate: 'day' },
        '1month': { weeks: 4, aggregate: 'week' },
        '3month': { weeks: 12, aggregate: 'week' },
        '6month': { weeks: 24, aggregate: 'month' },
        '12month': { weeks: 52, aggregate: 'month' },
        'overall': { weeks: 52, aggregate: 'month' }
    };
    return periodConfig[period] || { weeks: 12, aggregate: 'week' };
}

function getChartTextColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    if (theme === 'light') {
        return {
            text: '#4c4f69',    // Catppuccin Latte text
            grid: '#acb0be'     // Catppuccin Latte surface2
        };
    } else {
        return {
            text: '#cdd6f4',    // Catppuccin Mocha text
            grid: '#45475a'     // Catppuccin Mocha surface1
        };
    }
}

function initializeChart() {
    const colors = getChartTextColors();
    const ctx = document.getElementById('artist-chart').getContext('2d');
    artistChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: colors.text,
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cumulative Plays',
                        color: colors.text
                    },
                    ticks: {
                        color: colors.text,
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: colors.grid
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        color: colors.text
                    },
                    ticks: {
                        color: colors.text
                    },
                    grid: {
                        color: colors.grid
                    }
                }
            }
        }
    });
}

function updateChartColors() {
    const colors = getChartTextColors();
    const chartColors = getChartColors();

    // Update artist chart colors (if it exists)
    if (artistChart) {
        // Update dataset colors
        artistChart.data.datasets.forEach((dataset, index) => {
            const color = chartColors[index % chartColors.length];
            dataset.borderColor = color.border;
            dataset.backgroundColor = color.bg;
        });

        artistChart.options.plugins.legend.labels.color = colors.text;
        artistChart.options.scales.y.ticks.color = colors.text;
        artistChart.options.scales.y.grid.color = colors.grid;
        artistChart.options.scales.y.title.color = colors.text;
        artistChart.options.scales.x.ticks.color = colors.text;
        artistChart.options.scales.x.grid.color = colors.grid;
        artistChart.options.scales.x.title.color = colors.text;
        artistChart.update();
    }

    // Update genre chart colors
    if (genreChart) {
        // Update dataset colors
        genreChart.data.datasets.forEach((dataset, index) => {
            const color = chartColors[index % chartColors.length];
            dataset.borderColor = color.border;
            dataset.backgroundColor = color.bg;
            dataset.pointBackgroundColor = color.border;
            dataset.pointHoverBorderColor = color.border;
        });

        genreChart.options.plugins.legend.labels.color = colors.text;
        genreChart.options.scales.r.ticks.color = colors.text;
        genreChart.options.scales.r.grid.color = colors.grid;
        genreChart.options.scales.r.pointLabels.color = colors.text;
        genreChart.update();
    }

    // Update genre bar chart colors
    if (genreBarChart) {
        // Update dataset colors
        genreBarChart.data.datasets[0].backgroundColor = genreBarChart.data.labels.map((_, i) => chartColors[i % chartColors.length].border);
        genreBarChart.data.datasets[0].borderColor = genreBarChart.data.labels.map((_, i) => chartColors[i % chartColors.length].border);

        genreBarChart.options.plugins.legend.labels.color = colors.text;
        genreBarChart.options.scales.y.ticks.color = colors.text;
        genreBarChart.options.scales.y.grid.color = colors.grid;
        genreBarChart.options.scales.x.title.color = colors.text;
        genreBarChart.options.scales.x.ticks.color = colors.text;
        genreBarChart.options.scales.x.grid.color = colors.grid;
        genreBarChart.update();
    }

    // Update hipster donut chart colors
    if (hipsterDonutChart) {
        // Update dataset colors with hipster colors
        const hipsterColors = getHipsterColors();
        hipsterDonutChart.data.datasets[0].backgroundColor = hipsterDonutChart.data.labels.map(label => hipsterColors[label]);

        hipsterDonutChart.options.plugins.legend.labels.color = colors.text;
        hipsterDonutChart.update();
    }

    // Update score formula chart colors
    if (scoreFormulaChart) {
        // Update main curve color
        scoreFormulaChart.data.datasets[0].borderColor = colors.text;

        scoreFormulaChart.options.scales.x.title.color = colors.text;
        scoreFormulaChart.options.scales.x.ticks.color = colors.text;
        scoreFormulaChart.options.scales.x.grid.color = colors.grid;
        scoreFormulaChart.options.scales.y.title.color = colors.text;
        scoreFormulaChart.options.scales.y.ticks.color = colors.text;
        scoreFormulaChart.options.scales.y.grid.color = colors.grid;
        scoreFormulaChart.update();
    }

    // Regenerate hipster explanation to update distribution bar colors
    generateHipsterExplanation();

    // Reinitialize score formula chart since the canvas was replaced
    if (scoreFormulaChart) {
        scoreFormulaChart.destroy();
    }
    initializeScoreFormulaChart();
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

        const chartColors = getChartColors();
        const color = chartColors[chartArtists.length % chartColors.length];

        chartArtists.push({ name: artistName, period: period });

        artistChart.data.datasets.push({
            label: `${artistName}`,
            data: data,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0,
            cubicInterpolationMode: 'monotone',
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
        });

        artistChart.update();
    } catch (error) {
        console.error('Error toggling artist in chart:', error);
    } finally {
        // Hide loading indicator
        loadingElement.style.display = 'none';
    }
}

async function loadArtistHistory(artists, period) {
    // Check cache first
    if (artistHistoryCache[period]) {
        updateChartWithCachedData(artistHistoryCache[period], period);
        return;
    }

    const loadingElement = document.getElementById('chart-loading');
    loadingElement.style.display = 'block';

    const config = getWeeksForPeriod(period);
    const historyData = {};

    try {
        // Fetch history for all artists in parallel
        const promises = artists.map(artist =>
            fetch(`api/lastfm/artist-history/${encodeURIComponent(artist.name)}?weeks=${config.weeks}&aggregate=${config.aggregate}`)
                .then(r => r.json())
                .then(history => ({ name: artist.name, history }))
                .catch(err => {
                    console.error(`Error loading history for ${artist.name}:`, err);
                    return { name: artist.name, history: [] };
                })
        );

        const results = await Promise.all(promises);
        results.forEach(({ name, history }) => {
            historyData[name] = history;
        });

        // Cache it
        artistHistoryCache[period] = historyData;

        // Update chart
        updateChartWithCachedData(historyData, period);
    } catch (error) {
        console.error('Error loading artist history:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

function updateChartWithCachedData(historyData, period) {
    // Clear current chart
    artistChart.data.datasets = [];
    chartArtists = [];

    const artistNames = Object.keys(historyData);
    if (artistNames.length === 0) return;

    // Set labels from first artist
    const firstHistory = historyData[artistNames[0]];
    if (!firstHistory || firstHistory.length === 0) return;

    chartLabels = firstHistory.map(week => {
        const date = new Date(parseInt(week.week_start) * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    artistChart.data.labels = chartLabels;

    // Add all artists
    artistNames.forEach((name, index) => {
        const history = historyData[name];
        if (!history || history.length === 0) return;

        let cumulative = 0;
        const data = history.map(week => {
            cumulative += week.playcount;
            return cumulative;
        });

        const chartColors = getChartColors();
        const color = chartColors[index % chartColors.length];
        chartArtists.push({ name, period });

        artistChart.data.datasets.push({
            label: name,
            data: data,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0,
            cubicInterpolationMode: 'monotone',
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
        });
    });

    artistChart.update('none');
}


function initializeGenreChart() {
    const colors = getChartTextColors();
    const ctx = document.getElementById('genre-chart').getContext('2d');
    genreChart = new Chart(ctx, {
        type: 'radar',
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
                        color: colors.text,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.r + '%';
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        display: false,
                        backdropColor: 'transparent',
                        maxTicksLimit: 5
                    },
                    grid: {
                        color: colors.grid
                    },
                    pointLabels: {
                        color: colors.text,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

async function loadGenreProfile() {
    // Hardcoded periods: This Month, Last 3 Months, This Year
    const periods = ['1month', '3month', '12month'];

    const loadingElement = document.getElementById('genre-loading');

    try {
        loadingElement.style.display = 'block';

        const response = await fetch(`api/lastfm/genre-profile?periods=${periods.join(',')}`);
        const data = await response.json();

        // Collect all unique genres across all periods
        const allGenres = new Set();
        Object.values(data).forEach(periodData => {
            Object.keys(periodData).forEach(genre => allGenres.add(genre));
        });

        genreChart.data.labels = Array.from(allGenres);

        // Create datasets for each period
        const periodLabels = {
            '1month': 'This Month',
            '3month': 'Last 3 Months',
            '12month': 'This Year'
        };

        const chartColors = getChartColors();
        genreChart.data.datasets = periods.map((period, index) => {
            const periodData = data[period] || {};
            const values = genreChart.data.labels.map(genre => periodData[genre] || 0);

            const color = chartColors[index % chartColors.length];

            return {
                label: periodLabels[period] || period,
                data: values,
                borderColor: color.border,
                backgroundColor: color.bg,
                borderWidth: 2,
                pointBackgroundColor: color.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 2,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: color.border,
                pointHoverRadius: 4
            };
        });

        genreChart.update();
    } catch (error) {
        console.error('Error loading genre profile:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

function initializeGenreBarChart() {
    const colors = getChartTextColors();
    const chartColors = getChartColors();
    const ctx = document.getElementById('genre-bar-chart').getContext('2d');
    genreBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Plays',
                data: [],
                backgroundColor: chartColors.map(c => c.border),
                borderColor: chartColors.map(c => c.border),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: colors.text
                    },
                    grid: {
                        color: colors.grid
                    }
                },
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Plays',
                        color: colors.text
                    },
                    ticks: {
                        color: colors.text
                    },
                    grid: {
                        color: colors.grid
                    }
                }
            }
        }
    });
}

async function loadTopGenresBar(period = '1month') {
    const loadingElement = document.getElementById('genre-bar-loading');

    try {
        loadingElement.style.display = 'block';

        const response = await fetch(`api/lastfm/top-genres?period=${period}`);
        const data = await response.json();

        genreBarChart.data.labels = data.map(item => item.genre);
        genreBarChart.data.datasets[0].data = data.map(item => item.count);

        // Assign colors
        const chartColors = getChartColors();
        genreBarChart.data.datasets[0].backgroundColor = data.map((_, i) => chartColors[i % chartColors.length].border);
        genreBarChart.data.datasets[0].borderColor = data.map((_, i) => chartColors[i % chartColors.length].border);

        genreBarChart.update();
    } catch (error) {
        console.error('Error loading top genres:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

function initializeHipsterDonut() {
    const colors = getChartTextColors();
    const ctx = document.getElementById('hipster-donut').getContext('2d');

    hipsterDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        padding: 10,
                        font: {
                            size: 11
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

let scoreFormulaChart = null;

function initializeScoreFormulaChart() {
    const colors = getChartTextColors();
    const ctx = document.getElementById('score-formula-chart').getContext('2d');

    // Generate data points for the formula curve
    const scores = [];
    const listenerCounts = [];
    const pointRadii = [];
    const pointHoverRadii = [];

    // Generate points from 0 to 100 score, calculate corresponding listeners
    for (let score = 0; score <= 100; score += 0.5) {
        const listeners = scoreToListeners(score);
        scores.push(score);
        listenerCounts.push(listeners);

        // Only show points at cutoff values
        const isCutoff = [0, 10, 35, 60, 85, 100].includes(score);
        pointRadii.push(isCutoff ? 4 : 0);
        pointHoverRadii.push(isCutoff ? 6 : 0);
    }

    scoreFormulaChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Listeners',
                    data: scores.map((score, i) => ({
                        x: score,
                        y: listenerCounts[i]
                    })),
                    borderColor: colors.text,
                    borderWidth: 3,
                    pointRadius: pointRadii,
                    pointHoverRadius: pointHoverRadii,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Listeners: ${formatListeners(context.parsed.y)}`;
                            }
                            return '';
                        },
                        title: function(context) {
                            if (context[0].datasetIndex === 0) {
                                return `Score: ${context[0].parsed.x.toFixed(0)}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Hipster Score',
                        color: colors.text
                    },
                    ticks: {
                        color: colors.text,
                        callback: function(value) {
                            if (value === 0) return 'Mainstream (0)';
                            if (value === 10) return 'Popular (10)';
                            if (value === 35) return 'Indie (35)';
                            if (value === 60) return 'Underground (60)';
                            if (value === 85) return 'Ultra Hipster (85)';
                            if (value === 100) return '100';
                            return '';
                        },
                        autoSkip: false,
                        stepSize: null,
                        includeBounds: true
                    },
                    afterBuildTicks: function(axis) {
                        axis.ticks = [
                            { value: 0 },
                            { value: 10 },
                            { value: 35 },
                            { value: 60 },
                            { value: 85 },
                            { value: 100 }
                        ];
                        return axis.ticks;
                    },
                    grid: {
                        color: colors.grid
                    }
                },
                y: {
                    type: 'logarithmic',
                    min: 100,
                    max: 10000000,
                    title: {
                        display: true,
                        text: 'Listeners (log scale)',
                        color: colors.text
                    },
                    ticks: {
                        color: colors.text,
                        callback: function(value) {
                            return formatListeners(value);
                        },
                        autoSkip: false
                    },
                    afterBuildTicks: function(axis) {
                        axis.ticks = [
                            { value: 100 },
                            { value: 1000 },
                            { value: 10000 },
                            { value: 100000 },
                            { value: 1000000 },
                            { value: 10000000 }
                        ];
                    },
                    grid: {
                        color: colors.grid
                    }
                }
            }
        }
    });
}

async function loadMusicStats(period = '1month') {
    const loadingElement = document.getElementById('stats-loading');

    try {
        loadingElement.style.display = 'block';

        const response = await fetch(`api/lastfm/music-stats?period=${period}`);
        const data = await response.json();

        // Update average hipster score
        const avgScore = data.avgHipsterScore;
        document.getElementById('avg-hipster-score').textContent = avgScore;

        // Set color based on score
        const scoreElement = document.getElementById('avg-hipster-score');
        scoreElement.style.color = getHipsterColor(avgScore);
        document.getElementById('hipster-label').textContent = getHipsterLabel(avgScore);

        // Populate dynamic cutoffs
        const cutoffs = getHipsterCutoffs();
        const cutoffsHTML = cutoffs.map(c => `${c.emoji} ${c.range}`).join(' • ');
        document.getElementById('hipster-cutoffs').innerHTML = cutoffsHTML;

        // Update hipster distribution donut
        const distribution = data.hipsterDistribution;
        const labels = Object.keys(distribution).filter(key => distribution[key] > 0);
        const values = labels.map(label => distribution[label]);
        const hipsterColors = getHipsterColors();
        const colors = labels.map(label => hipsterColors[label]);

        hipsterDonutChart.data.labels = labels;
        hipsterDonutChart.data.datasets[0].data = values;
        hipsterDonutChart.data.datasets[0].backgroundColor = colors;
        hipsterDonutChart.update();

        // Update artist diversity
        document.getElementById('diversity-percentage').textContent =
            data.artistDiversity.topArtistPercentage + '%';
        document.getElementById('top-artist-name').textContent =
            data.artistDiversity.topArtistName;

    } catch (error) {
        console.error('Error loading music stats:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Load data on page load
(async () => {
    loadLastPlayed();
    loadTracks();
    loadTopArtists('1month');
    initializeChart();
    initializeGenreChart();
    initializeGenreBarChart();
    initializeHipsterDonut();
    loadGenreProfile();
    loadTopGenresBar('1month');
    loadMusicStats('1month');
    generateHipsterExplanation();

    // Initialize formula chart after explanation is rendered
    setTimeout(() => {
        initializeScoreFormulaChart();
    }, 100);
})();

// Add event listener for period selector
document.getElementById('period-selector').addEventListener('change', (e) => {
    currentPeriod = e.target.value;
    loadTopArtists(e.target.value);
});

// Add event listener for collapsible section
document.getElementById('recently-played-toggle').addEventListener('click', () => {
    const tracksGrid = document.getElementById('tracks');
    const collapseIcon = document.querySelector('.collapse-icon');

    tracksGrid.classList.toggle('collapsed');
    collapseIcon.classList.toggle('collapsed');
});

// Genre chart loads automatically on page load, no manual trigger needed

// Add event listener for genre period selector
document.getElementById('genre-period-selector').addEventListener('change', async (e) => {
    loadTopGenresBar(e.target.value);
});

// Add event listener for stats period selector
document.getElementById('stats-period-selector').addEventListener('change', async (e) => {
    loadMusicStats(e.target.value);
});

// Generic toggle handler
function initializeToggleGroup(groupName, onToggle) {
    const buttons = document.querySelectorAll(`[data-group="${groupName}"]`);

    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            const value = e.currentTarget.dataset.value;

            // Update active state
            buttons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Callback
            onToggle(value);
        });
    });

    return (value) => {
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === value);
        });
    };
}

// Live mode toggle
let refreshInterval = null;

function startLiveMode() {
    if (refreshInterval) return; // Already running

    refreshInterval = setInterval(() => {
        loadLastPlayed();
        loadTracks();
        const selectedPeriod = document.getElementById('period-selector').value;
        loadTopArtists(selectedPeriod);
    }, 30000);

    localStorage.setItem('liveMode', 'true');
}

function stopLiveMode() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

    localStorage.setItem('liveMode', 'false');
}

// Initialize live mode toggle
const setLiveModeActive = initializeToggleGroup('live-mode', (value) => {
    if (value === 'live') {
        startLiveMode();
    } else {
        stopLiveMode();
    }
});

// Theme toggle
const themes = ['system', 'light', 'dark'];
let currentThemeIndex = 0;

function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }

    localStorage.setItem('theme', theme);

    // Update chart colors to match new theme
    updateChartColors();

    // Update active state
    setThemeActive(theme);
}

// Initialize theme toggle
const setThemeActive = initializeToggleGroup('theme', (value) => {
    applyTheme(value);
    currentThemeIndex = themes.indexOf(value);
});

// Listen for system theme changes when in system mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    if (savedTheme === 'system') {
        applyTheme('system');
        updateChartColors();
    }
});

// Initialize on page load
const savedLiveMode = localStorage.getItem('liveMode');
if (savedLiveMode === 'false') {
    stopLiveMode();
    setLiveModeActive('paused');
} else {
    startLiveMode();
    setLiveModeActive('live');
}

const savedTheme = localStorage.getItem('theme') || 'system';
currentThemeIndex = themes.indexOf(savedTheme);
applyTheme(savedTheme);
