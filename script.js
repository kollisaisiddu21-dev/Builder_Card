/**
 * BUILDER CARD — SCRIPT (PHASE 6: RECENT GITHUB ACTIVITY)
 * Handles live GitHub REST API integration for:
 * 1. Developer Profile (/users/{username})
 * 2. Developer Repositories (/users/{username}/repos?per_page=100&sort=updated)
 * 3. Programming Language Analytics (/repos/{owner}/{repo}/languages)
 * 4. Recent Public Events Activity (/users/{username}/events/public?per_page=10)
 *    - Human-readable event description formatter
 *    - Event type markers and icons (Push, PR, Issue, Comment, Star, Fork, Create, Delete, Release, Generic)
 *    - Relative timestamps ("Just now", "5 minutes ago", "2 hours ago", "3 days ago")
 *    - Safe DOM rendering, partial failure isolation, and race condition prevention.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------------------
    // 1. DOM Element References
    // -------------------------------------------------------------------------
    // Search Form & Input
    const searchForm = document.getElementById('search-form');
    const usernameInput = document.getElementById('username-input');
    const searchButton = document.getElementById('search-btn');
    const searchBtnText = document.getElementById('search-btn-text');
    const statusMessage = document.getElementById('status-message');

    // Dashboard Container Views
    const emptyStateView = document.getElementById('empty-state');
    const loadingStateView = document.getElementById('loading-state');
    const errorContainer = document.getElementById('error-states-container');
    const profileDashboard = document.getElementById('profile-dashboard');

    // Specific Error Cards
    const errorNotFound = document.getElementById('error-not-found');
    const errorNotFoundDesc = document.getElementById('error-not-found-desc');
    const errorNetwork = document.getElementById('error-network');
    const errorNetworkDesc = document.getElementById('error-network-desc');
    const errorRateLimit = document.getElementById('error-ratelimit');
    const errorRateLimitDesc = document.getElementById('error-ratelimit-desc');
    const rateLimitBadge = document.getElementById('rate-limit-badge');

    // Profile Card Elements
    const profileAvatar = document.getElementById('profile-avatar');
    const profileAvatarFallback = document.getElementById('profile-avatar-fallback');
    const developerName = document.getElementById('developer-name');
    const developerHandle = document.getElementById('developer-handle');
    const developerBio = document.getElementById('developer-bio');
    const profileExternalLink = document.getElementById('profile-external-link');
    const profileLiveBanner = document.getElementById('profile-live-banner');

    // Profile Metadata Rows
    const metaLocation = document.getElementById('meta-location');
    const locationValue = document.getElementById('location-value');
    const metaCompany = document.getElementById('meta-company');
    const companyValue = document.getElementById('company-value');
    const metaBlog = document.getElementById('meta-blog');
    const blogLink = document.getElementById('blog-link');
    const metaJoined = document.getElementById('meta-joined');
    const joinedValue = document.getElementById('joined-value');
    const accountAgeBadge = document.getElementById('account-age-badge');

    // Key Metric Statistics Elements
    const statRepos = document.getElementById('stat-repos');
    const statFollowers = document.getElementById('stat-followers');
    const statFollowing = document.getElementById('stat-following');
    const statAge = document.getElementById('stat-age');

    // Repository Section Elements
    const reposGrid = document.getElementById('repos-grid');
    const reposCountBadge = document.getElementById('repos-count-badge');
    const viewAllReposLink = document.getElementById('view-all-repos-link');
    const emptyReposView = document.getElementById('empty-repos-view');
    const emptyReposTitle = document.getElementById('empty-repos-title');
    const emptyReposDesc = document.getElementById('empty-repos-desc');
    const reposErrorView = document.getElementById('repos-error-view');
    const reposErrorDesc = document.getElementById('repos-error-desc');
    const sortStarsBtn = document.getElementById('sort-stars');
    const sortUpdatedBtn = document.getElementById('sort-updated');

    // Language Analytics Elements
    const languagesSubtitle = document.getElementById('languages-subtitle');
    const languagesWarningBox = document.getElementById('languages-warning-box');
    const languagesWarningText = document.getElementById('languages-warning-text');
    const languagesContentWrap = document.getElementById('languages-content-wrap');
    const languageProgressBar = document.getElementById('language-progress-bar');
    const languageList = document.getElementById('language-list');
    const languagesEmptyView = document.getElementById('languages-empty-view');
    const languagesEmptyTitle = document.getElementById('languages-empty-title');
    const languagesEmptyDesc = document.getElementById('languages-empty-desc');

    // Activity Section Elements
    const activityScopeTag = document.getElementById('activity-scope-tag');
    const timelineList = document.getElementById('timeline-list');
    const emptyActivityView = document.getElementById('empty-activity-view');
    const emptyActivityTitle = document.getElementById('empty-activity-title');
    const emptyActivityDesc = document.getElementById('empty-activity-desc');
    const activityErrorView = document.getElementById('activity-error-view');
    const activityErrorDesc = document.getElementById('activity-error-desc');

    // Download PNG Card Elements
    const btnDownloadCard = document.getElementById('btn-download-card');
    const downloadBtnText = document.getElementById('download-btn-text');
    const downloadBtnSpinner = document.getElementById('download-btn-spinner');
    const downloadIcon = document.getElementById('download-icon');

    // Dedicated 1200x800px Export Container Elements
    const exportCard = document.getElementById('export-card');
    const exportAvatarImg = document.getElementById('export-avatar-img');
    const exportAvatarFallback = document.getElementById('export-avatar-fallback');
    const exportDevName = document.getElementById('export-dev-name');
    const exportDevHandle = document.getElementById('export-dev-handle');
    const exportBadgeJoined = document.getElementById('export-badge-joined');
    const exportBadgeLocation = document.getElementById('export-badge-location');
    const exportBio = document.getElementById('export-bio');
    const exportStatRepos = document.getElementById('export-stat-repos');
    const exportStatFollowers = document.getElementById('export-stat-followers');
    const exportStatFollowing = document.getElementById('export-stat-following');
    const exportLangProgressBar = document.getElementById('export-lang-progress-bar');
    const exportLangLegend = document.getElementById('export-lang-legend');
    const exportEmptyLanguages = document.getElementById('export-empty-languages');
    const exportReposList = document.getElementById('export-repos-list');
    const exportEmptyRepos = document.getElementById('export-empty-repos');
    const exportProfileUrl = document.getElementById('export-profile-url');

    // -------------------------------------------------------------------------
    // 2. Application State & Configuration
    // -------------------------------------------------------------------------
    const MAX_LANGUAGE_REPOSITORIES = 10;
    const languageCache = new Map();

    let isRequestRunning = false;
    let activeRequestId = 0;
    let activeAbortController = null;
    let isExporting = false;

    let currentProfileData = null;
    let currentLanguageAnalytics = null;
    let currentRawRepositories = [];
    let currentFilteredRepositories = [];
    let currentSortOption = 'stars'; // 'stars' | 'updated'
    let currentSearchedUser = '';

    // Standard GitHub Language Color Mapping
    const LANGUAGE_COLORS = {
        'C++': '#f34b7d',
        'C': '#555555',
        'Python': '#3572a5',
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Java': '#b07219',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Go': '#00add8',
        'Rust': '#dea584',
        'Shell': '#89e051',
        'Ruby': '#701516',
        'PHP': '#4f5d95',
        'Swift': '#f05138',
        'Kotlin': '#a97bff',
        'Dart': '#00b4ab',
        'Vue': '#41b883',
        'Assembly': '#6E4C13',
        'Makefile': '#427819',
        'Others': '#64748b'
    };

    // -------------------------------------------------------------------------
    // 3. Input Validation
    // -------------------------------------------------------------------------

    function validateGitHubUsername(username) {
        if (!username || username.trim() === '') {
            return {
                isValid: false,
                message: 'Please enter a GitHub username to generate a card.',
                cleaned: ''
            };
        }

        const trimmed = username.trim();

        if (trimmed.length > 39) {
            return {
                isValid: false,
                message: 'GitHub usernames cannot exceed 39 characters.',
                cleaned: trimmed
            };
        }

        const validPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

        if (!validPattern.test(trimmed)) {
            if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
                return {
                    isValid: false,
                    message: 'GitHub username cannot begin or end with a hyphen.',
                    cleaned: trimmed
                };
            }
            if (trimmed.includes('--')) {
                return {
                    isValid: false,
                    message: 'GitHub username cannot contain consecutive hyphens.',
                    cleaned: trimmed
                };
            }
            return {
                isValid: false,
                message: 'GitHub username can only contain alphanumeric characters and single hyphens.',
                cleaned: trimmed
            };
        }

        return {
            isValid: true,
            message: '',
            cleaned: trimmed
        };
    }

    // -------------------------------------------------------------------------
    // 4. GitHub REST API Services
    // -------------------------------------------------------------------------

    async function fetchUserProfile(username, signal = null) {
        const endpointUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(endpointUrl, fetchOptions);

        const rateLimit = {
            limit: response.headers.get('X-RateLimit-Limit') || '60',
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset')
        };

        if (!response.ok) {
            let errorJson = null;
            try { errorJson = await response.json(); } catch {}

            const error = new Error(errorJson?.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.rateLimit = rateLimit;
            error.apiMessage = errorJson?.message || '';
            throw error;
        }

        const profileData = await response.json();
        return { profile: profileData, rateLimit };
    }

    async function fetchRepositories(username, signal = null) {
        const endpointUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(endpointUrl, fetchOptions);

        const rateLimit = {
            limit: response.headers.get('X-RateLimit-Limit') || '60',
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset')
        };

        if (!response.ok) {
            let errorJson = null;
            try { errorJson = await response.json(); } catch {}

            const error = new Error(errorJson?.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.rateLimit = rateLimit;
            error.apiMessage = errorJson?.message || '';
            throw error;
        }

        const reposData = await response.json();
        return { repositories: Array.isArray(reposData) ? reposData : [], rateLimit };
    }

    async function fetchRepositoryLanguages(owner, repo, signal = null) {
        const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;

        if (languageCache.has(cacheKey)) {
            return languageCache.get(cacheKey);
        }

        const endpointUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(endpointUrl, fetchOptions);

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status} fetching languages for ${owner}/${repo}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        const result = (data && typeof data === 'object') ? data : {};

        languageCache.set(cacheKey, result);
        return result;
    }

    async function fetchLanguageAnalytics(repositories, signal = null) {
        const eligible = repositories.filter(repo => !repo.fork && !repo.archived);

        if (eligible.length === 0) {
            return {
                status: 'no_eligible',
                analyzedCount: 0,
                eligibleCount: 0,
                languages: [],
                totalBytes: 0,
                partialFailure: false
            };
        }

        const sortedByStars = [...eligible].sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0));
        const targetRepos = sortedByStars.slice(0, MAX_LANGUAGE_REPOSITORIES);

        const fetchPromises = targetRepos.map(repo => {
            const owner = (repo.owner && repo.owner.login) ? repo.owner.login : repo.full_name.split('/')[0];
            return fetchRepositoryLanguages(owner, repo.name, signal);
        });

        const settledResults = await Promise.allSettled(fetchPromises);

        const languageTotals = {};
        let totalBytes = 0;
        let successfulCount = 0;
        let failedCount = 0;

        settledResults.forEach(result => {
            if (result.status === 'fulfilled') {
                successfulCount++;
                const repoLanguages = result.value;
                for (const [langName, bytes] of Object.entries(repoLanguages)) {
                    if (typeof bytes === 'number' && bytes > 0) {
                        languageTotals[langName] = (languageTotals[langName] || 0) + bytes;
                        totalBytes += bytes;
                    }
                }
            } else {
                failedCount++;
            }
        });

        if (successfulCount === 0 && failedCount > 0) {
            return {
                status: 'all_failed',
                analyzedCount: 0,
                eligibleCount: targetRepos.length,
                languages: [],
                totalBytes: 0,
                partialFailure: false
            };
        }

        if (totalBytes === 0) {
            return {
                status: 'no_data',
                analyzedCount: successfulCount,
                eligibleCount: targetRepos.length,
                languages: [],
                totalBytes: 0,
                partialFailure: failedCount > 0,
                failedCount
            };
        }

        const sortedLanguages = Object.entries(languageTotals)
            .map(([name, bytes]) => ({
                name,
                bytes,
                percentage: (bytes / totalBytes) * 100
            }))
            .sort((a, b) => b.bytes - a.bytes);

        let displayLanguages = [];
        if (sortedLanguages.length <= 5) {
            displayLanguages = sortedLanguages;
        } else {
            const topFive = sortedLanguages.slice(0, 5);
            const remaining = sortedLanguages.slice(5);
            const othersBytes = remaining.reduce((sum, item) => sum + item.bytes, 0);
            const othersPercentage = (othersBytes / totalBytes) * 100;

            displayLanguages = [
                ...topFive,
                {
                    name: 'Others',
                    bytes: othersBytes,
                    percentage: othersPercentage,
                    isOther: true
                }
            ];
        }

        return {
            status: 'success',
            analyzedCount: successfulCount,
            eligibleCount: targetRepos.length,
            languages: displayLanguages,
            totalBytes,
            partialFailure: failedCount > 0,
            failedCount
        };
    }

    /**
     * Retrieves the latest 10 public events for the user.
     * Endpoint: https://api.github.com/users/{username}/events/public?per_page=10
     * @param {string} username - Validated GitHub username
     * @returns {Promise<{ events: Array, rateLimit: Object }>}
     */
    async function fetchRecentActivity(username, signal = null) {
        const endpointUrl = `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=10`;

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(endpointUrl, fetchOptions);

        const rateLimit = {
            limit: response.headers.get('X-RateLimit-Limit') || '60',
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset')
        };

        if (!response.ok) {
            let errorJson = null;
            try { errorJson = await response.json(); } catch {}

            const error = new Error(errorJson?.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.rateLimit = rateLimit;
            error.apiMessage = errorJson?.message || '';
            throw error;
        }

        const eventsData = await response.json();
        return { events: Array.isArray(eventsData) ? eventsData : [], rateLimit };
    }

    // -------------------------------------------------------------------------
    // 5. Repository Filtering & Sorting Helpers
    // -------------------------------------------------------------------------

    function filterRepositories(repos) {
        if (!Array.isArray(repos)) return [];
        return repos.filter(repo => !repo.fork && !repo.archived);
    }

    function sortRepositories(repos, sortOption) {
        const list = [...repos];

        if (sortOption === 'stars') {
            return list.sort((a, b) => {
                const starsA = a.stargazers_count ?? 0;
                const starsB = b.stargazers_count ?? 0;
                if (starsB !== starsA) return starsB - starsA;
                return new Date(b.updated_at) - new Date(a.updated_at);
            });
        }

        if (sortOption === 'updated') {
            return list.sort((a, b) => {
                const dateA = new Date(a.updated_at).getTime();
                const dateB = new Date(b.updated_at).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0);
            });
        }

        return list;
    }

    // -------------------------------------------------------------------------
    // 6. Date, Time & Number Helpers
    // -------------------------------------------------------------------------

    function calculateAccountAge(createdAtString) {
        if (!createdAtString) {
            return { fullText: 'Account age unavailable', shortText: 'N/A', joinDate: 'Joined recently' };
        }

        const createdDate = new Date(createdAtString);
        if (isNaN(createdDate.getTime())) {
            return { fullText: 'Account age unavailable', shortText: 'N/A', joinDate: 'Joined recently' };
        }

        const now = new Date();
        let years = now.getFullYear() - createdDate.getFullYear();
        let months = now.getMonth() - createdDate.getMonth();
        let days = now.getDate() - createdDate.getDate();

        if (days < 0) months -= 1;
        if (months < 0) { years -= 1; months += 12; }

        let fullText = '';
        let shortText = '';

        if (years >= 1) {
            const yearStr = years === 1 ? '1 year' : `${years} years`;
            fullText = `GitHub member for ${yearStr}`;
            shortText = `${years} ${years === 1 ? 'Yr' : 'Yrs'}`;
        } else if (months >= 1) {
            const monthStr = months === 1 ? '1 month' : `${months} months`;
            fullText = `GitHub member for ${monthStr}`;
            shortText = `${months} Mo`;
        } else {
            const diffDays = Math.max(1, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)));
            const dayStr = diffDays === 1 ? '1 day' : `${diffDays} days`;
            fullText = `GitHub member for ${dayStr}`;
            shortText = `${diffDays}d`;
        }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const joinDate = `Joined ${monthNames[createdDate.getMonth()]} ${createdDate.getFullYear()}`;

        return { fullText, shortText, joinDate };
    }

    /**
     * Converts a timestamp into a human-readable relative time string:
     * - < 1 min: "Just now"
     * - < 1 hour: "X minutes ago"
     * - < 24 hours: "X hours ago"
     * - < 30 days: "X days ago"
     * - Older: Formatted calendar date (e.g. "Oct 12, 2026")
     * @param {string} dateString - ISO date string
     * @returns {string} Human-readable time
     */
    function formatRelativeTime(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Recently';

        const now = new Date();
        const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));

        if (diffSeconds < 60) {
            return 'Just now';
        }

        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        }

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        }

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }

        // Older dates: format into readable calendar string
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    function sanitizeUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        let trimmed = rawUrl.trim();
        if (!trimmed) return null;

        if (!/^https?:\/\//i.test(trimmed)) {
            trimmed = `https://${trimmed}`;
        }

        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
            return null;
        } catch {
            return null;
        }
    }

    function formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Number(num).toLocaleString('en-US');
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    // -------------------------------------------------------------------------
    // 7. Profile Rendering
    // -------------------------------------------------------------------------

    function renderProfile(profile) {
        if (profile.avatar_url) {
            profileAvatar.src = profile.avatar_url;
            profileAvatar.alt = `${profile.name || profile.login}'s GitHub avatar`;
            profileAvatar.classList.remove('hidden');
            profileAvatarFallback.classList.add('hidden');

            profileAvatar.onerror = () => {
                profileAvatar.classList.add('hidden');
                profileAvatarFallback.classList.remove('hidden');
            };
        } else {
            profileAvatar.classList.add('hidden');
            profileAvatarFallback.classList.remove('hidden');
        }

        developerName.textContent = (profile.name && profile.name.trim()) ? profile.name.trim() : profile.login;
        developerHandle.textContent = `@${profile.login}`;

        if (profile.bio && profile.bio.trim()) {
            developerBio.textContent = profile.bio.trim();
            developerBio.classList.remove('bio-empty');
        } else {
            developerBio.textContent = 'This developer has not added a public bio yet.';
            developerBio.classList.add('bio-empty');
        }

        const githubUrl = profile.html_url || `https://github.com/${profile.login}`;
        profileExternalLink.href = githubUrl;
        profileExternalLink.setAttribute('aria-label', `View ${profile.login} on GitHub`);

        if (profile.location && profile.location.trim()) {
            locationValue.textContent = profile.location.trim();
            metaLocation.classList.remove('hidden');
        } else {
            metaLocation.classList.add('hidden');
        }

        if (profile.company && profile.company.trim()) {
            companyValue.textContent = profile.company.trim();
            metaCompany.classList.remove('hidden');
        } else {
            metaCompany.classList.add('hidden');
        }

        if (profile.blog && profile.blog.trim()) {
            const rawBlog = profile.blog.trim();
            const safeUrl = sanitizeUrl(rawBlog);
            if (safeUrl) {
                blogLink.href = safeUrl;
                blogLink.textContent = rawBlog.replace(/^https?:\/\//i, '');
                metaBlog.classList.remove('hidden');
            } else {
                metaBlog.classList.add('hidden');
            }
        } else {
            metaBlog.classList.add('hidden');
        }

        const ageDetails = calculateAccountAge(profile.created_at);
        joinedValue.textContent = `${ageDetails.joinDate} `;
        accountAgeBadge.textContent = ageDetails.shortText;
        joinedValue.appendChild(accountAgeBadge);
        metaJoined.classList.remove('hidden');

        statRepos.textContent = (profile.public_repos ?? 0).toLocaleString();
        statFollowers.textContent = (profile.followers ?? 0).toLocaleString();
        statFollowing.textContent = (profile.following ?? 0).toLocaleString();
        statAge.textContent = ageDetails.shortText;

        if (profileLiveBanner) {
            profileLiveBanner.innerHTML = '';
            const bannerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            bannerIcon.setAttribute('width', '16');
            bannerIcon.setAttribute('height', '16');
            bannerIcon.setAttribute('viewBox', '0 0 24 24');
            bannerIcon.setAttribute('fill', 'none');
            bannerIcon.setAttribute('stroke', 'currentColor');
            bannerIcon.setAttribute('stroke-width', '2');
            bannerIcon.setAttribute('stroke-linecap', 'round');
            bannerIcon.setAttribute('stroke-linejoin', 'round');
            bannerIcon.setAttribute('aria-hidden', 'true');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M22 11.08V12a10 10 0 1 1-5.93-9.14');
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', '22 4 12 14.01 9 11.01');
            bannerIcon.appendChild(path);
            bannerIcon.appendChild(polyline);

            const bannerText = document.createElement('span');
            bannerText.appendChild(document.createTextNode('Live GitHub Profile: '));
            const strongHandle = document.createElement('strong');
            strongHandle.textContent = `@${profile.login}`;
            bannerText.appendChild(strongHandle);
            bannerText.appendChild(document.createTextNode(` • ${ageDetails.fullText}`));

            profileLiveBanner.appendChild(bannerIcon);
            profileLiveBanner.appendChild(bannerText);
        }

        currentProfileData = profile;

        if (btnDownloadCard) {
            btnDownloadCard.disabled = false;
            btnDownloadCard.classList.remove('loading', 'download-success');
            if (downloadBtnSpinner) downloadBtnSpinner.classList.add('hidden');
            if (downloadIcon) downloadIcon.classList.remove('hidden');
            if (downloadBtnText) downloadBtnText.textContent = 'Download PNG';
        }
    }

    // -------------------------------------------------------------------------
    // 8. Repository Card Rendering
    // -------------------------------------------------------------------------

    function createRepoIcon(type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');

        if (type === 'book') {
            svg.setAttribute('width', '16');
            svg.setAttribute('height', '16');
            svg.classList.add('repo-icon');
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p1.setAttribute('d', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p2.setAttribute('d', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');
            svg.appendChild(p1); svg.appendChild(p2);
        } else if (type === 'star') {
            svg.setAttribute('width', '14');
            svg.setAttribute('height', '14');
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            svg.appendChild(polygon);
        } else if (type === 'fork') {
            svg.setAttribute('width', '14');
            svg.setAttribute('height', '14');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '6'); line.setAttribute('y1', '3'); line.setAttribute('x2', '6'); line.setAttribute('y2', '15');
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c1.setAttribute('cx', '18'); c1.setAttribute('cy', '6'); c1.setAttribute('r', '3');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c2.setAttribute('cx', '6'); c2.setAttribute('cy', '18'); c2.setAttribute('r', '3');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M18 9a9 9 0 0 1-9 9');
            svg.appendChild(line); svg.appendChild(c1); svg.appendChild(c2); svg.appendChild(path);
        }
        return svg;
    }

    function renderRepositories(filteredRepositories, sortOption = 'stars', username = '') {
        if (viewAllReposLink && username) {
            viewAllReposLink.href = `https://github.com/${encodeURIComponent(username)}?tab=repositories`;
            viewAllReposLink.target = '_blank';
            viewAllReposLink.rel = 'noopener noreferrer';
        }

        reposErrorView.classList.add('hidden');

        if (!filteredRepositories || filteredRepositories.length === 0) {
            reposGrid.classList.add('hidden');
            emptyReposView.classList.remove('hidden');

            if (reposCountBadge) {
                reposCountBadge.textContent = '0 Repositories';
            }

            if (currentRawRepositories.length === 0) {
                emptyReposTitle.textContent = 'No Public Repositories';
                emptyReposDesc.textContent = 'This user has not published any public repositories on GitHub yet.';
            } else {
                emptyReposTitle.textContent = 'No Repositories Match Filter';
                emptyReposDesc.textContent = `All ${currentRawRepositories.length} public repositories for this user are forks or archived.`;
            }
            return;
        }

        emptyReposView.classList.add('hidden');
        reposGrid.classList.remove('hidden');

        const sorted = sortRepositories(filteredRepositories, sortOption);
        const topSix = sorted.slice(0, 6);

        if (reposCountBadge) {
            reposCountBadge.textContent = `Top ${topSix.length} of ${filteredRepositories.length}`;
        }

        reposGrid.innerHTML = '';

        topSix.forEach(repo => {
            const card = document.createElement('article');
            card.className = 'repo-card glass-panel';

            const cardTop = document.createElement('div');
            cardTop.className = 'repo-card-top';

            const nameGroup = document.createElement('div');
            nameGroup.className = 'repo-name-group';
            nameGroup.appendChild(createRepoIcon('book'));

            const titleHeading = document.createElement('h4');
            titleHeading.className = 'repo-name';

            const repoLink = document.createElement('a');
            repoLink.className = 'repo-link';
            repoLink.href = repo.html_url || `https://github.com/${repo.full_name}`;
            repoLink.textContent = repo.name;
            repoLink.target = '_blank';
            repoLink.rel = 'noopener noreferrer';
            repoLink.setAttribute('aria-label', `Open repository ${repo.name} on GitHub`);
            titleHeading.appendChild(repoLink);
            nameGroup.appendChild(titleHeading);

            const visibilityBadge = document.createElement('span');
            visibilityBadge.className = 'repo-visibility';
            visibilityBadge.textContent = repo.visibility ? (repo.visibility.charAt(0).toUpperCase() + repo.visibility.slice(1)) : 'Public';

            cardTop.appendChild(nameGroup);
            cardTop.appendChild(visibilityBadge);

            const desc = document.createElement('p');
            desc.className = 'repo-description';
            if (repo.description && repo.description.trim()) {
                desc.textContent = repo.description.trim();
            } else {
                desc.textContent = 'No description provided for this repository.';
                desc.classList.add('desc-empty');
            }

            const metaRow = document.createElement('div');
            metaRow.className = 'repo-meta-row';

            const langWrapper = document.createElement('div');
            langWrapper.className = 'repo-language';

            const langDot = document.createElement('span');
            langDot.className = 'language-dot';
            const langName = repo.language ? repo.language.trim() : null;
            const dotColor = langName && LANGUAGE_COLORS[langName] ? LANGUAGE_COLORS[langName] : '#94a3b8';
            langDot.style.backgroundColor = dotColor;
            langDot.setAttribute('aria-hidden', 'true');

            const langLabel = document.createElement('span');
            langLabel.className = 'language-name';
            langLabel.textContent = langName || 'Not specified';

            langWrapper.appendChild(langDot);
            langWrapper.appendChild(langLabel);

            const starStat = document.createElement('div');
            const starCount = repo.stargazers_count ?? 0;
            starStat.className = 'repo-stat';
            starStat.title = `${starCount.toLocaleString()} Stars`;
            starStat.appendChild(createRepoIcon('star'));
            const starSpan = document.createElement('span');
            starSpan.textContent = starCount.toLocaleString();
            starStat.appendChild(starSpan);

            const forkStat = document.createElement('div');
            const forkCount = repo.forks_count ?? 0;
            forkStat.className = 'repo-stat';
            forkStat.title = `${forkCount.toLocaleString()} Forks`;
            forkStat.appendChild(createRepoIcon('fork'));
            const forkSpan = document.createElement('span');
            forkSpan.textContent = forkCount.toLocaleString();
            forkStat.appendChild(forkSpan);

            const updatedSpan = document.createElement('span');
            updatedSpan.className = 'repo-updated';
            updatedSpan.textContent = formatRelativeTime(repo.updated_at);

            metaRow.appendChild(langWrapper);
            metaRow.appendChild(starStat);
            metaRow.appendChild(forkStat);
            metaRow.appendChild(updatedSpan);

            card.appendChild(cardTop);
            card.appendChild(desc);
            card.appendChild(metaRow);

            reposGrid.appendChild(card);
        });
    }

    // -------------------------------------------------------------------------
    // 9. Language Analytics Rendering
    // -------------------------------------------------------------------------

    function renderLanguageAnalytics(analytics) {
        currentLanguageAnalytics = analytics;
        languagesWarningBox.classList.add('hidden');

        if (!analytics || analytics.status === 'no_eligible') {
            languagesContentWrap.classList.add('hidden');
            languagesEmptyView.classList.remove('hidden');
            languagesEmptyTitle.textContent = 'No Eligible Repositories';
            languagesEmptyDesc.textContent = 'This user has no non-forked, non-archived repositories available to analyze.';
            languagesSubtitle.textContent = 'No repositories available for language analysis';
            return;
        }

        if (analytics.status === 'all_failed') {
            languagesContentWrap.classList.add('hidden');
            languagesEmptyView.classList.remove('hidden');
            languagesEmptyTitle.textContent = 'Language Data Unavailable';
            languagesEmptyDesc.textContent = 'Unable to retrieve language byte statistics from GitHub at this time.';
            languagesSubtitle.textContent = 'Language statistics retrieval failed';
            return;
        }

        if (analytics.status === 'no_data') {
            languagesContentWrap.classList.add('hidden');
            languagesEmptyView.classList.remove('hidden');
            languagesEmptyTitle.textContent = 'No Code Detected';
            languagesEmptyDesc.textContent = `Analyzed ${analytics.analyzedCount} repository(ies), but no source code language data was recorded.`;
            languagesSubtitle.textContent = `Language breakdown across ${analytics.analyzedCount} analyzed repositories`;
            return;
        }

        languagesEmptyView.classList.add('hidden');
        languagesContentWrap.classList.remove('hidden');

        const repoPlural = analytics.analyzedCount === 1 ? 'repository' : 'repositories';
        languagesSubtitle.textContent = `Language breakdown across ${analytics.analyzedCount} analyzed ${repoPlural}`;

        if (analytics.partialFailure && analytics.failedCount > 0) {
            languagesWarningBox.classList.remove('hidden');
            const failPlural = analytics.failedCount === 1 ? 'repository' : 'repositories';
            languagesWarningText.textContent = `${analytics.failedCount} ${failPlural} could not be analyzed due to API limits or errors.`;
        }

        languageProgressBar.innerHTML = '';
        languageList.innerHTML = '';

        analytics.languages.forEach(lang => {
            const color = LANGUAGE_COLORS[lang.name] || '#64748b';
            const formattedPercent = lang.percentage.toFixed(1);

            const segment = document.createElement('span');
            segment.className = 'progress-segment';
            segment.style.width = `${lang.percentage}%`;
            segment.style.backgroundColor = color;
            segment.title = `${lang.name}: ${formattedPercent}% (${formatBytes(lang.bytes)})`;
            languageProgressBar.appendChild(segment);

            const item = document.createElement('div');
            item.className = 'lang-item';

            const info = document.createElement('div');
            info.className = 'lang-info';

            const dot = document.createElement('span');
            dot.className = 'language-dot';
            dot.style.backgroundColor = color;
            dot.setAttribute('aria-hidden', 'true');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'lang-name';
            nameSpan.textContent = lang.name;

            info.appendChild(dot);
            info.appendChild(nameSpan);

            const percentSpan = document.createElement('span');
            percentSpan.className = 'lang-percentage';
            percentSpan.textContent = `${formattedPercent}%`;
            percentSpan.title = `${formatBytes(lang.bytes)} of total`;

            item.appendChild(info);
            item.appendChild(percentSpan);

            languageList.appendChild(item);
        });
    }

    // -------------------------------------------------------------------------
    // 10. Recent GitHub Activity Rendering
    // -------------------------------------------------------------------------

    /**
     * Creates a lightweight SVG icon corresponding to the event type.
     * @param {'push' | 'pr' | 'issue' | 'comment' | 'star' | 'fork' | 'create' | 'delete' | 'release' | 'generic'} iconType
     * @returns {SVGElement} Safe SVG DOM node
     */
    function createActivityIcon(iconType) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '12');
        svg.setAttribute('height', '12');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2.5');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');

        if (iconType === 'push') {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 19V5M5 12l7-7 7 7');
            svg.appendChild(path);
        } else if (iconType === 'pr') {
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c1.setAttribute('cx', '18'); c1.setAttribute('cy', '18'); c1.setAttribute('r', '3');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c2.setAttribute('cx', '6'); c2.setAttribute('cy', '6'); c2.setAttribute('r', '3');
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'M13 6h3a2 2 0 0 1 2 2v7');
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', '6'); l.setAttribute('y1', '9'); l.setAttribute('x2', '6'); l.setAttribute('y2', '21');
            svg.appendChild(c1); svg.appendChild(c2); svg.appendChild(p); svg.appendChild(l);
        } else if (iconType === 'issue') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '10');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l1.setAttribute('x1', '12'); l1.setAttribute('y1', '8'); l1.setAttribute('x2', '12'); l1.setAttribute('y2', '12');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l2.setAttribute('x1', '12'); l2.setAttribute('y1', '16'); l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '16');
            svg.appendChild(c); svg.appendChild(l1); svg.appendChild(l2);
        } else if (iconType === 'comment') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z');
            svg.appendChild(p);
        } else if (iconType === 'star') {
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            svg.appendChild(poly);
        } else if (iconType === 'fork') {
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', '6'); l.setAttribute('y1', '3'); l.setAttribute('x2', '6'); l.setAttribute('y2', '15');
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c1.setAttribute('cx', '18'); c1.setAttribute('cy', '6'); c1.setAttribute('r', '3');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c2.setAttribute('cx', '6'); c2.setAttribute('cy', '18'); c2.setAttribute('r', '3');
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'M18 9a9 9 0 0 1-9 9');
            svg.appendChild(l); svg.appendChild(c1); svg.appendChild(c2); svg.appendChild(p);
        } else if (iconType === 'create') {
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l1.setAttribute('x1', '12'); l1.setAttribute('y1', '5'); l1.setAttribute('x2', '12'); l1.setAttribute('y2', '19');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l2.setAttribute('x1', '5'); l2.setAttribute('y1', '12'); l2.setAttribute('x2', '19'); l2.setAttribute('y2', '12');
            svg.appendChild(l1); svg.appendChild(l2);
        } else if (iconType === 'delete') {
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', '5'); l.setAttribute('y1', '12'); l.setAttribute('x2', '19'); l.setAttribute('y2', '12');
            svg.appendChild(l);
        } else if (iconType === 'release') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p1.setAttribute('d', 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z');
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', '7'); l.setAttribute('y1', '7'); l.setAttribute('x2', '7.01'); l.setAttribute('y2', '7');
            svg.appendChild(p1); svg.appendChild(l);
        } else {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '5');
            svg.appendChild(c);
        }

        return svg;
    }

    /**
     * Converts a raw GitHub event object into human-readable description and metadata.
     * @param {Object} event - Raw GitHub event JSON
     * @returns {{ descText: string, branchText: string|null, prRef: string|null, markerClass: string, iconType: string, repoName: string, repoUrl: string|null, timestamp: string }}
     */
    function formatActivityEvent(event) {
        const type = event.type || '';
        const payload = event.payload || {};
        const repoName = event.repo?.name || 'Unknown repository';
        const repoUrl = event.repo?.name ? `https://github.com/${event.repo.name}` : null;
        const timestamp = formatRelativeTime(event.created_at);

        let descText = '';
        let branchText = null;
        let prRef = null;
        let markerClass = 'marker-generic';
        let iconType = 'generic';

        if (type === 'PushEvent') {
            const commitCount = payload.size || payload.commits?.length || payload.distinct_size || 1;
            const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : null;
            descText = `Pushed ${commitCount} commit${commitCount === 1 ? '' : 's'} to`;
            branchText = branch || 'main';
            markerClass = 'marker-push';
            iconType = 'push';
        } else if (type === 'PullRequestEvent') {
            const action = payload.action ? (payload.action.charAt(0).toUpperCase() + payload.action.slice(1)) : 'Updated';
            const prNum = payload.pull_request?.number;
            const prTitle = payload.pull_request?.title;
            descText = `${action} pull request`;
            prRef = prNum ? `#${prNum}` : '';
            if (prTitle) {
                descText += `: ${prTitle.length > 36 ? prTitle.slice(0, 36) + '...' : prTitle}`;
            }
            markerClass = 'marker-pr';
            iconType = 'pr';
        } else if (type === 'IssuesEvent') {
            const action = payload.action ? (payload.action.charAt(0).toUpperCase() + payload.action.slice(1)) : 'Updated';
            const issueNum = payload.issue?.number;
            const issueTitle = payload.issue?.title;
            descText = `${action} issue`;
            prRef = issueNum ? `#${issueNum}` : '';
            if (issueTitle) {
                descText += `: ${issueTitle.length > 36 ? issueTitle.slice(0, 36) + '...' : issueTitle}`;
            }
            markerClass = 'marker-issue';
            iconType = 'issue';
        } else if (type === 'IssueCommentEvent') {
            const isPR = Boolean(payload.issue?.pull_request);
            const num = payload.issue?.number;
            descText = `Commented on ${isPR ? 'pull request' : 'issue'}`;
            prRef = num ? `#${num}` : '';
            markerClass = 'marker-comment';
            iconType = 'comment';
        } else if (type === 'WatchEvent') {
            descText = 'Starred repository';
            markerClass = 'marker-watch';
            iconType = 'star';
        } else if (type === 'ForkEvent') {
            const forkee = payload.forkee?.full_name;
            descText = forkee ? `Forked repository to ${forkee}` : 'Forked repository';
            markerClass = 'marker-fork';
            iconType = 'fork';
        } else if (type === 'CreateEvent') {
            const refType = payload.ref_type || 'repository';
            const refName = payload.ref;
            if (refType === 'repository') {
                descText = 'Created repository';
            } else {
                descText = `Created ${refType}`;
                branchText = refName || null;
            }
            markerClass = 'marker-create';
            iconType = 'create';
        } else if (type === 'DeleteEvent') {
            const refType = payload.ref_type || 'branch';
            const refName = payload.ref;
            descText = `Deleted ${refType}`;
            branchText = refName || null;
            markerClass = 'marker-delete';
            iconType = 'delete';
        } else if (type === 'ReleaseEvent') {
            const releaseName = payload.release?.name || payload.release?.tag_name || 'new release';
            descText = `Published release ${releaseName}`;
            markerClass = 'marker-release';
            iconType = 'release';
        } else {
            const cleanType = type.replace('Event', '');
            descText = `${cleanType || 'Public'} activity recorded`;
            markerClass = 'marker-generic';
            iconType = 'generic';
        }

        return {
            descText,
            branchText,
            prRef,
            markerClass,
            iconType,
            repoName,
            repoUrl,
            timestamp
        };
    }

    /**
     * Renders up to 10 recent public events into the vertical activity timeline.
     * Uses textContent and safe DOM construction to eliminate any XSS vulnerability.
     * @param {Array} events - Public GitHub events array
     * @param {string} username - Searched user login
     */
    function renderRecentActivity(events, username = '') {
        activityErrorView.classList.add('hidden');

        if (!events || events.length === 0) {
            timelineList.classList.add('hidden');
            emptyActivityView.classList.remove('hidden');
            if (activityScopeTag) {
                activityScopeTag.textContent = '0 Events';
            }
            emptyActivityTitle.textContent = 'No Recent Activity';
            emptyActivityDesc.textContent = 'No recent public activity found for this user.';
            return;
        }

        emptyActivityView.classList.add('hidden');
        timelineList.classList.remove('hidden');

        if (activityScopeTag) {
            activityScopeTag.textContent = `${events.length} Events`;
        }

        timelineList.innerHTML = '';

        events.forEach(event => {
            const eventInfo = formatActivityEvent(event);

            const item = document.createElement('div');
            item.className = 'timeline-item';

            // Marker & Icon
            const marker = document.createElement('div');
            marker.className = `timeline-marker ${eventInfo.markerClass}`;
            marker.setAttribute('aria-label', eventInfo.descText);
            marker.appendChild(createActivityIcon(eventInfo.iconType));

            // Content Block
            const content = document.createElement('div');
            content.className = 'timeline-content';

            // Description Row
            const desc = document.createElement('p');
            desc.className = 'timeline-desc';

            const descTextNode = document.createTextNode(eventInfo.descText);
            desc.appendChild(descTextNode);

            if (eventInfo.prRef) {
                const prRefSpan = document.createElement('span');
                prRefSpan.className = 'timeline-pr-ref';
                prRefSpan.textContent = ` ${eventInfo.prRef}`;
                desc.appendChild(prRefSpan);
            }

            if (eventInfo.branchText) {
                const space = document.createTextNode(' ');
                const branchCode = document.createElement('code');
                branchCode.className = 'timeline-branch';
                branchCode.textContent = eventInfo.branchText;
                desc.appendChild(space);
                desc.appendChild(branchCode);
            }

            // Meta Row (Repo Link + Dot + Relative Timestamp)
            const meta = document.createElement('div');
            meta.className = 'timeline-meta';

            if (eventInfo.repoUrl) {
                const repoLink = document.createElement('a');
                repoLink.className = 'timeline-repo';
                repoLink.href = eventInfo.repoUrl;
                repoLink.textContent = eventInfo.repoName;
                repoLink.target = '_blank';
                repoLink.rel = 'noopener noreferrer';
                repoLink.setAttribute('aria-label', `View ${eventInfo.repoName} on GitHub`);
                meta.appendChild(repoLink);
            } else {
                const repoSpan = document.createElement('span');
                repoSpan.className = 'timeline-repo';
                repoSpan.textContent = eventInfo.repoName;
                meta.appendChild(repoSpan);
            }

            const dot = document.createElement('span');
            dot.className = 'timeline-dot';
            dot.textContent = '•';
            dot.setAttribute('aria-hidden', 'true');

            const time = document.createElement('span');
            time.className = 'timeline-time';
            time.textContent = eventInfo.timestamp;

            meta.appendChild(dot);
            meta.appendChild(time);

            content.appendChild(desc);
            content.appendChild(meta);

            item.appendChild(marker);
            item.appendChild(content);

            timelineList.appendChild(item);
        });
    }

    // -------------------------------------------------------------------------
    // 11. Builder Card PNG Export Engine (Phase 7)
    // -------------------------------------------------------------------------

    /**
     * Converts an image URL into a Base64 data URI to prevent any CORS canvas tainting.
     * @param {string} url - External image URL
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<string|null>} Data URI or null
     */
    async function fetchImageAsBase64(url, timeoutMs = 3000) {
        if (!url) return null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                mode: 'cors',
                cache: 'force-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) return null;
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            clearTimeout(timeoutId);
            return null;
        }
    }

    /**
     * Populates the dedicated 1200x800px export card with active profile and analytics data.
     * @param {Object} profile - GitHub profile object
     * @param {Array} repos - Filtered repositories array
     * @param {Object|null} languageAnalytics - Language analytics object
     */
    async function populateExportCard(profile, repos, languageAnalytics) {
        if (!profile || !profile.login) return;

        // 1. Avatar loading & cross-origin handling
        const avatarUrl = profile.avatar_url;
        let base64Avatar = null;
        if (avatarUrl) {
            base64Avatar = await fetchImageAsBase64(avatarUrl, 3000);
        }

        if (base64Avatar) {
            exportAvatarImg.src = base64Avatar;
            exportAvatarImg.classList.remove('hidden');
            exportAvatarFallback.classList.add('hidden');
            if (exportAvatarImg.decode) {
                try { await exportAvatarImg.decode(); } catch {}
            }
        } else if (avatarUrl) {
            // Secondary direct load attempt with crossOrigin
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, 2000);
                exportAvatarImg.crossOrigin = 'anonymous';
                exportAvatarImg.onload = () => { clearTimeout(timer); resolve(); };
                exportAvatarImg.onerror = () => {
                    clearTimeout(timer);
                    exportAvatarImg.classList.add('hidden');
                    exportAvatarFallback.classList.remove('hidden');
                    resolve();
                };
                exportAvatarImg.src = avatarUrl;
                exportAvatarImg.classList.remove('hidden');
                exportAvatarFallback.classList.add('hidden');
            });
        } else {
            exportAvatarImg.classList.add('hidden');
            exportAvatarFallback.classList.remove('hidden');
        }

        // 2. Developer Names & Handle
        exportDevName.textContent = (profile.name && profile.name.trim()) ? profile.name.trim() : profile.login;
        exportDevHandle.textContent = `@${profile.login}`;

        // 3. Badges: Joined Year & Location
        if (profile.created_at) {
            const joinYear = new Date(profile.created_at).getFullYear();
            exportBadgeJoined.textContent = `Joined ${joinYear}`;
            exportBadgeJoined.classList.remove('hidden');
        } else {
            exportBadgeJoined.classList.add('hidden');
        }

        if (profile.location && profile.location.trim()) {
            exportBadgeLocation.textContent = profile.location.trim();
            exportBadgeLocation.classList.remove('hidden');
        } else {
            exportBadgeLocation.classList.add('hidden');
        }

        // 4. Bio
        if (profile.bio && profile.bio.trim()) {
            exportBio.textContent = profile.bio.trim();
            exportBio.classList.remove('hidden');
        } else {
            exportBio.textContent = 'Active developer & open-source contributor on GitHub.';
            exportBio.classList.remove('hidden');
        }

        // 5. Key Statistics
        exportStatRepos.textContent = formatNumber(profile.public_repos || 0);
        exportStatFollowers.textContent = formatNumber(profile.followers || 0);
        exportStatFollowing.textContent = formatNumber(profile.following || 0);

        // 6. Programming Language Analytics
        exportLangProgressBar.innerHTML = '';
        exportLangLegend.innerHTML = '';

        const hasLanguages = languageAnalytics && Array.isArray(languageAnalytics.languages) && languageAnalytics.languages.length > 0;

        if (hasLanguages && languageAnalytics.totalBytes > 0) {
            exportEmptyLanguages.classList.add('hidden');
            exportLangProgressBar.classList.remove('hidden');
            exportLangLegend.classList.remove('hidden');

            const totalBytes = languageAnalytics.totalBytes;
            const languages = languageAnalytics.languages;

            languages.forEach(lang => {
                const pct = (lang.bytes / totalBytes) * 100;
                const formattedPercent = pct.toFixed(1);
                const color = LANGUAGE_COLORS[lang.name] || '#64748b';

                // Bar segment
                const segment = document.createElement('div');
                segment.className = 'export-lang-segment';
                segment.style.width = `${pct}%`;
                segment.style.backgroundColor = color;
                exportLangProgressBar.appendChild(segment);

                // Legend row
                const item = document.createElement('div');
                item.className = 'export-lang-item';

                const left = document.createElement('div');
                left.className = 'export-lang-left';

                const dot = document.createElement('span');
                dot.className = 'export-lang-dot';
                dot.style.backgroundColor = color;

                const name = document.createElement('span');
                name.className = 'export-lang-name';
                name.textContent = lang.name;

                left.appendChild(dot);
                left.appendChild(name);

                const pctSpan = document.createElement('span');
                pctSpan.className = 'export-lang-pct';
                pctSpan.textContent = `${formattedPercent}%`;

                item.appendChild(left);
                item.appendChild(pctSpan);
                exportLangLegend.appendChild(item);
            });
        } else {
            exportLangProgressBar.classList.add('hidden');
            exportLangLegend.classList.add('hidden');
            exportEmptyLanguages.classList.remove('hidden');
        }

        // 7. Top 3 Repositories
        exportReposList.innerHTML = '';
        const eligibleRepos = (Array.isArray(repos) ? repos : []).filter(r => !r.fork && !r.archived);
        const top3Repos = [...eligibleRepos]
            .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
            .slice(0, 3);

        if (top3Repos.length > 0) {
            exportEmptyRepos.classList.add('hidden');
            exportReposList.classList.remove('hidden');

            top3Repos.forEach(repo => {
                const card = document.createElement('div');
                card.className = 'export-repo-item';

                const topRow = document.createElement('div');
                topRow.className = 'export-repo-top';

                const titleWrap = document.createElement('div');
                titleWrap.className = 'export-repo-title-wrap';

                const repoIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                repoIcon.setAttribute('width', '14');
                repoIcon.setAttribute('height', '14');
                repoIcon.setAttribute('viewBox', '0 0 24 24');
                repoIcon.setAttribute('fill', 'none');
                repoIcon.setAttribute('stroke', '#60a5fa');
                repoIcon.setAttribute('stroke-width', '2');
                repoIcon.setAttribute('stroke-linecap', 'round');
                repoIcon.setAttribute('stroke-linejoin', 'round');
                const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p1.setAttribute('d', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20');
                const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p2.setAttribute('d', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');
                repoIcon.appendChild(p1);
                repoIcon.appendChild(p2);

                const repoName = document.createElement('span');
                repoName.className = 'export-repo-title';
                repoName.textContent = repo.name;

                titleWrap.appendChild(repoIcon);
                titleWrap.appendChild(repoName);

                const meta = document.createElement('div');
                meta.className = 'export-repo-meta';

                if (repo.language) {
                    const langWrap = document.createElement('div');
                    langWrap.className = 'export-repo-lang';
                    const langDot = document.createElement('span');
                    langDot.className = 'export-lang-dot';
                    langDot.style.backgroundColor = LANGUAGE_COLORS[repo.language] || '#64748b';
                    const langLabel = document.createElement('span');
                    langLabel.textContent = repo.language;
                    langWrap.appendChild(langDot);
                    langWrap.appendChild(langLabel);
                    meta.appendChild(langWrap);
                }

                const starsWrap = document.createElement('div');
                starsWrap.className = 'export-repo-stars';
                starsWrap.textContent = `★ ${formatNumber(repo.stargazers_count || 0)}`;
                meta.appendChild(starsWrap);

                topRow.appendChild(titleWrap);
                topRow.appendChild(meta);

                const desc = document.createElement('p');
                desc.className = 'export-repo-desc';
                desc.textContent = (repo.description && repo.description.trim())
                    ? repo.description.trim()
                    : 'No description provided.';

                card.appendChild(topRow);
                card.appendChild(desc);
                exportReposList.appendChild(card);
            });
        } else {
            exportReposList.classList.add('hidden');
            exportEmptyRepos.classList.remove('hidden');
        }

        // 8. Footer GitHub attribution
        exportProfileUrl.textContent = `github.com/${profile.login}`;
    }

    /**
     * Captures the dedicated export card using html2canvas and triggers a PNG download.
     */
    async function downloadBuilderCard() {
        if (isExporting) return;

        if (!currentProfileData || !currentProfileData.login) {
            displayStatus('Please search and load a valid GitHub profile before exporting a card.', 'error');
            return;
        }

        isExporting = true;
        btnDownloadCard.disabled = true;
        btnDownloadCard.classList.add('loading');
        if (downloadBtnSpinner) downloadBtnSpinner.classList.remove('hidden');
        if (downloadIcon) downloadIcon.classList.add('hidden');
        if (downloadBtnText) downloadBtnText.textContent = 'Generating...';

        try {
            // Populate export card with active data
            await populateExportCard(currentProfileData, currentFilteredRepositories, currentLanguageAnalytics);

            if (typeof html2canvas === 'undefined') {
                throw new Error('Image export library (html2canvas) is not loaded.');
            }

            // High-DPI canvas capture (2x scale for crisp 2400x1600 output)
            const canvas = await html2canvas(exportCard, {
                width: 1200,
                height: 800,
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#090d16',
                logging: false,
                imageTimeout: 4000
            });

            const cleanLogin = (currentProfileData.login || 'developer').toLowerCase().replace(/[^a-z0-9-_]/g, '');
            const filename = `builder-card-${cleanLogin}.png`;

            // Trigger browser download via Blob / DataURL
            if (canvas.toBlob) {
                await new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion produced null blob'));
                            return;
                        }
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            resolve();
                        }, 250);
                    }, 'image/png');
                });
            } else {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                }, 250);
            }

            // Success state
            btnDownloadCard.classList.remove('loading');
            btnDownloadCard.classList.add('download-success');
            if (downloadBtnSpinner) downloadBtnSpinner.classList.add('hidden');
            if (downloadBtnText) downloadBtnText.textContent = 'Downloaded!';

            // Revert after 2.5s
            setTimeout(() => {
                btnDownloadCard.classList.remove('download-success');
                if (downloadBtnText) downloadBtnText.textContent = 'Download PNG';
                if (downloadIcon) downloadIcon.classList.remove('hidden');
                btnDownloadCard.disabled = false;
                isExporting = false;
            }, 2500);

        } catch (exportError) {
            console.error('Builder Card export failed:', exportError);
            displayStatus('Failed to generate PNG image. Please try again.', 'error');

            btnDownloadCard.classList.remove('loading', 'download-success');
            if (downloadBtnSpinner) downloadBtnSpinner.classList.add('hidden');
            if (downloadBtnText) downloadBtnText.textContent = 'Download PNG';
            if (downloadIcon) downloadIcon.classList.remove('hidden');
            btnDownloadCard.disabled = false;
            isExporting = false;
        }
    }

    // -------------------------------------------------------------------------
    // 12. Loading and UI State Management
    // -------------------------------------------------------------------------

    function showLoading() {
        isRequestRunning = true;
        searchButton.disabled = true;
        searchBtnText.textContent = 'Fetching...';

        emptyStateView.classList.add('hidden');
        errorContainer.classList.add('hidden');
        profileDashboard.classList.add('hidden');
        loadingStateView.classList.remove('hidden');
    }

    function hideLoading() {
        isRequestRunning = false;
        searchButton.disabled = false;
        searchBtnText.textContent = 'Generate Card';
        loadingStateView.classList.add('hidden');
    }

    function setUIState(stateName) {
        emptyStateView.classList.add('hidden');
        loadingStateView.classList.add('hidden');
        errorContainer.classList.add('hidden');
        profileDashboard.classList.add('hidden');

        errorNotFound.classList.add('hidden');
        errorNetwork.classList.add('hidden');
        errorRateLimit.classList.add('hidden');

        reposGrid.classList.remove('hidden');
        emptyReposView.classList.add('hidden');
        reposErrorView.classList.add('hidden');
        timelineList.classList.remove('hidden');
        emptyActivityView.classList.add('hidden');
        activityErrorView.classList.add('hidden');

        switch (stateName) {
            case 'empty':
                emptyStateView.classList.remove('hidden');
                currentProfileData = null;
                currentLanguageAnalytics = null;
                if (btnDownloadCard) {
                    btnDownloadCard.disabled = true;
                }
                break;

            case 'loading':
                loadingStateView.classList.remove('hidden');
                break;

            case 'dashboard':
                profileDashboard.classList.remove('hidden');
                if (!currentProfileData) {
                    currentProfileData = {
                        login: 'alexmorgan',
                        name: 'Alex Morgan',
                        bio: 'Full-stack engineer & open-source contributor. Building developer tools, high-performance web systems, and exploring distributed architecture.',
                        location: 'San Francisco, CA',
                        company: 'Acme Systems',
                        blog: 'https://alexmorgan.dev',
                        created_at: '2019-03-15T10:00:00Z',
                        public_repos: 48,
                        followers: 1420,
                        following: 215,
                        avatar_url: ''
                    };
                    currentFilteredRepositories = [
                        { name: 'hyper-flow', stargazers_count: 342, language: 'TypeScript', description: 'High-throughput async streaming pipeline for real-time web services.' },
                        { name: 'quantum-cache', stargazers_count: 219, language: 'Rust', description: 'Zero-overhead in-memory key-value cache engine with lock-free atomics.' },
                        { name: 'dev-lens', stargazers_count: 188, language: 'JavaScript', description: 'Developer productivity analytics CLI and visualization dashboard.' }
                    ];
                    currentLanguageAnalytics = {
                        status: 'ok',
                        totalBytes: 1540000,
                        languages: [
                            { name: 'TypeScript', bytes: 693000 },
                            { name: 'JavaScript', bytes: 385000 },
                            { name: 'Python', bytes: 231000 },
                            { name: 'Rust', bytes: 154000 },
                            { name: 'HTML', bytes: 77000 }
                        ]
                    };
                }
                if (btnDownloadCard) {
                    btnDownloadCard.disabled = false;
                    btnDownloadCard.classList.remove('loading', 'download-success');
                    if (downloadBtnSpinner) downloadBtnSpinner.classList.add('hidden');
                    if (downloadIcon) downloadIcon.classList.remove('hidden');
                    if (downloadBtnText) downloadBtnText.textContent = 'Download PNG';
                }
                break;

            case 'invalid':
                errorContainer.classList.remove('hidden');
                errorNotFound.classList.remove('hidden');
                break;

            case 'network':
                errorContainer.classList.remove('hidden');
                errorNetwork.classList.remove('hidden');
                break;

            case 'ratelimit':
                errorContainer.classList.remove('hidden');
                errorRateLimit.classList.remove('hidden');
                break;

            case 'empty-repos':
                profileDashboard.classList.remove('hidden');
                reposGrid.classList.add('hidden');
                emptyReposView.classList.remove('hidden');
                break;

            case 'empty-activity':
                profileDashboard.classList.remove('hidden');
                timelineList.classList.add('hidden');
                emptyActivityView.classList.remove('hidden');
                break;

            default:
                emptyStateView.classList.remove('hidden');
                break;
        }
    }

    function displayStatus(message, type = 'error') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message visible status-${type}`;

        if (type === 'error') {
            usernameInput.classList.add('input-error');
        } else {
            usernameInput.classList.remove('input-error');
        }
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        usernameInput.classList.remove('input-error');
    }

    // -------------------------------------------------------------------------
    // 12. API Error Handling
    // -------------------------------------------------------------------------

    function handleApiError(error, username = '') {
        hideLoading();

        if (error && error.name === 'AbortError') {
            return;
        }

        if (error instanceof TypeError || !error || !error.status) {
            errorNetworkDesc.textContent = 'Unable to connect to GitHub. Please check your internet connection or network settings and try again.';
            setUIState('network');
            displayStatus('Network connection error. Please verify your connection.', 'error');
            return;
        }

        if (error.status === 404) {
            const userDisplay = username ? `@${username}` : 'user';
            errorNotFoundDesc.textContent = `GitHub user "${userDisplay}" was not found. Please check the spelling and try again.`;
            setUIState('invalid');
            displayStatus(`GitHub user ${userDisplay} not found. Please verify the username.`, 'error');
            return;
        }

        if (error.status === 403 || error.status === 429) {
            const isRateLimit = error.status === 429 ||
                (error.rateLimit && error.rateLimit.remaining === '0') ||
                (error.apiMessage && error.apiMessage.toLowerCase().includes('rate limit'));

            if (isRateLimit) {
                let resetMessage = 'The public GitHub REST API hourly request threshold (60 requests/hour) has been reached.';

                if (error.rateLimit && error.rateLimit.reset) {
                    const resetTimestamp = parseInt(error.rateLimit.reset, 10) * 1000;
                    const resetDate = new Date(resetTimestamp);
                    const minutesLeft = Math.max(1, Math.ceil((resetTimestamp - Date.now()) / 60000));
                    const timeString = resetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    resetMessage += ` Requests will automatically resume when the limit window resets at ${timeString} (in approximately ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}).`;
                }

                errorRateLimitDesc.textContent = resetMessage;
                if (rateLimitBadge) {
                    rateLimitBadge.textContent = `Status: 0 / ${error.rateLimit?.limit || 60} Requests Remaining`;
                }
                setUIState('ratelimit');
                displayStatus('GitHub API rate limit reached. Requests are temporarily limited.', 'error');
                return;
            } else {
                errorNetworkDesc.textContent = 'GitHub API access was restricted (HTTP 403 Forbidden). The requested resource may be restricted by organization policies.';
                setUIState('network');
                displayStatus('Access to GitHub API was restricted.', 'error');
                return;
            }
        }

        if (error.status >= 500 && error.status < 600) {
            errorNetworkDesc.textContent = `GitHub service is currently experiencing server issues (HTTP ${error.status}). Please try again in a few moments.`;
            setUIState('network');
            displayStatus(`GitHub service temporarily unavailable (HTTP ${error.status}).`, 'error');
            return;
        }

        errorNetworkDesc.textContent = 'GitHub returned an unexpected response. Please try again.';
        setUIState('network');
        displayStatus(`GitHub request failed (HTTP ${error.status}).`, 'error');
    }

    // -------------------------------------------------------------------------
    // 13. Primary Search Workflow
    // -------------------------------------------------------------------------

    async function handleSearch() {
        const rawValue = usernameInput.value;
        const validation = validateGitHubUsername(rawValue);

        if (!validation.isValid) {
            displayStatus(validation.message, 'error');
            usernameInput.classList.add('input-error');
            usernameInput.focus();
            return;
        }

        const targetUsername = validation.cleaned;

        // If exact same username is already currently fetching, avoid duplicate trigger
        if (isRequestRunning && currentSearchedUser.toLowerCase() === targetUsername.toLowerCase()) {
            return;
        }

        // Cancel previous in-flight requests if a new search is initiated
        if (activeAbortController) {
            activeAbortController.abort();
        }
        activeAbortController = new AbortController();
        const signal = activeAbortController.signal;

        const requestId = ++activeRequestId;
        currentSearchedUser = targetUsername;
        isRequestRunning = true;

        clearStatus();
        showLoading();

        // Immediately reset downstream sections and export state to prevent mixing old & new data
        currentProfileData = null;
        currentLanguageAnalytics = null;
        currentRawRepositories = [];
        currentFilteredRepositories = [];

        if (btnDownloadCard) {
            btnDownloadCard.disabled = true;
            btnDownloadCard.classList.remove('download-success', 'loading');
            if (downloadBtnSpinner) downloadBtnSpinner.classList.add('hidden');
            if (downloadIcon) downloadIcon.classList.remove('hidden');
            if (downloadBtnText) downloadBtnText.textContent = 'Download PNG';
        }
        renderLanguageAnalytics(null);
        renderRecentActivity([], '');

        try {
            // Concurrent execution: fetch profile, repositories, and recent events
            const [profileResult, reposResult, activityResult] = await Promise.allSettled([
                fetchUserProfile(targetUsername, signal),
                fetchRepositories(targetUsername, signal),
                fetchRecentActivity(targetUsername, signal)
            ]);

            // Guard against superseded requests from newer searches
            if (requestId !== activeRequestId) {
                return;
            }

            // Profile evaluation: profile is essential to render the card
            if (profileResult.status === 'rejected') {
                const reason = profileResult.reason;
                if (reason && reason.name === 'AbortError') {
                    return; // Silently ignore cancelled requests
                }
                handleApiError(reason, targetUsername);
                return;
            }

            const { profile, rateLimit } = profileResult.value;
            currentSearchedUser = profile.login;

            // Display populated dashboard container before rendering individual sections
            setUIState('dashboard');

            // Render Developer Profile Card
            renderProfile(profile);

            // Repository evaluation: graceful degradation if repo retrieval fails
            if (reposResult.status === 'fulfilled') {
                const { repositories } = reposResult.value;
                currentRawRepositories = repositories;
                currentFilteredRepositories = filterRepositories(currentRawRepositories);

                renderRepositories(currentFilteredRepositories, currentSortOption, currentSearchedUser);

                // Fetch and render programming language analytics
                const languageAnalytics = await fetchLanguageAnalytics(currentRawRepositories, signal);

                if (requestId === activeRequestId) {
                    renderLanguageAnalytics(languageAnalytics);
                }
            } else {
                currentRawRepositories = [];
                currentFilteredRepositories = [];
                reposGrid.classList.add('hidden');
                emptyReposView.classList.add('hidden');
                reposErrorView.classList.remove('hidden');

                const repoError = reposResult.reason;
                if (reposCountBadge) {
                    reposCountBadge.textContent = 'Unavailable';
                }
                const isRepoRateLimit = repoError?.status === 403 || repoError?.status === 429;
                reposErrorDesc.textContent = isRepoRateLimit
                    ? 'Repository requests are currently rate limited by GitHub.'
                    : 'Unable to retrieve repository showcase at this time.';

                renderLanguageAnalytics({ status: 'all_failed' });
            }

            // Recent Activity evaluation: independent fault isolation
            if (activityResult.status === 'fulfilled') {
                const { events } = activityResult.value;
                renderRecentActivity(events, currentSearchedUser);
            } else {
                timelineList.classList.add('hidden');
                emptyActivityView.classList.add('hidden');
                activityErrorView.classList.remove('hidden');
                if (activityScopeTag) {
                    activityScopeTag.textContent = 'Unavailable';
                }
                activityErrorDesc.textContent = 'Unable to retrieve recent public events from GitHub at this time.';
            }

            const remainingNotice = (rateLimit && rateLimit.remaining !== null)
                ? ` (${rateLimit.remaining} GitHub API calls remaining this hour)`
                : '';
            displayStatus(`Displaying profile, repositories, languages & activity for @${profile.login}.${remainingNotice}`, 'info');

        } catch (unexpectedError) {
            if (unexpectedError && unexpectedError.name === 'AbortError') {
                return;
            }
            if (requestId === activeRequestId) {
                handleApiError(unexpectedError, targetUsername);
            }
        } finally {
            if (requestId === activeRequestId) {
                hideLoading();
            }
        }
    }

    // -------------------------------------------------------------------------
    // 14. Sorting Controls Handlers
    // -------------------------------------------------------------------------

    function updateSortingOption(sortOption) {
        if (currentSortOption === sortOption) return;

        currentSortOption = sortOption;

        if (sortOption === 'stars') {
            sortStarsBtn.classList.add('active');
            sortStarsBtn.setAttribute('aria-selected', 'true');
            sortUpdatedBtn.classList.remove('active');
            sortUpdatedBtn.setAttribute('aria-selected', 'false');
        } else {
            sortUpdatedBtn.classList.add('active');
            sortUpdatedBtn.setAttribute('aria-selected', 'true');
            sortStarsBtn.classList.remove('active');
            sortStarsBtn.setAttribute('aria-selected', 'false');
        }

        if (currentFilteredRepositories.length > 0) {
            renderRepositories(currentFilteredRepositories, currentSortOption, currentSearchedUser);
        }
    }

    sortStarsBtn.addEventListener('click', () => updateSortingOption('stars'));
    sortUpdatedBtn.addEventListener('click', () => updateSortingOption('updated'));

    // -------------------------------------------------------------------------
    // 15. Event Listeners
    // -------------------------------------------------------------------------

    usernameInput.addEventListener('input', () => {
        usernameInput.classList.remove('input-error');
        clearStatus();
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSearch();
    });

    if (btnDownloadCard) {
        btnDownloadCard.addEventListener('click', () => {
            downloadBuilderCard();
        });
    }

    document.querySelectorAll('.error-retry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearStatus();
            setUIState('empty');
            usernameInput.value = '';
            usernameInput.focus();
        });
    });

    // Initialize application on empty landing state
    setUIState('empty');

});
