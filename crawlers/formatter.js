// Data Formatter Utilities
// Provides formatting and normalization functions for crawler data

/**
 * Formats a date/time string to unified format (YYYY-MM-DD HH:MM:SS)
 * Handles various input formats from different platforms
 * @param {string} timeStr - Input time string
 * @returns {string} Formatted time string
 */
function formatTime(timeStr) {
    if (!timeStr) return '';

    try {
        // Remove common Chinese characters
        let cleaned = timeStr
            .replace(/年/g, '-')
            .replace(/月/g, '-')
            .replace(/日/g, ' ')
            .replace(/时/g, ':')
            .replace(/分/g, ':')
            .replace(/秒/g, '')
            .trim();

        // Handle relative time formats
        const now = new Date();

        // "刚刚", "just now"
        if (/刚刚|just now/i.test(cleaned)) {
            return formatDate(now);
        }

        // "X分钟前", "X minutes ago"
        const minutesMatch = cleaned.match(/(\d+)\s*分钟前|(\d+)\s*minutes?\s*ago/i);
        if (minutesMatch) {
            const minutes = parseInt(minutesMatch[1] || minutesMatch[2]);
            now.setMinutes(now.getMinutes() - minutes);
            return formatDate(now);
        }

        // "X小时前", "X hours ago"
        const hoursMatch = cleaned.match(/(\d+)\s*小时前|(\d+)\s*hours?\s*ago/i);
        if (hoursMatch) {
            const hours = parseInt(hoursMatch[1] || hoursMatch[2]);
            now.setHours(now.getHours() - hours);
            return formatDate(now);
        }

        // "X天前", "X days ago"
        const daysMatch = cleaned.match(/(\d+)\s*天前|(\d+)\s*days?\s*ago/i);
        if (daysMatch) {
            const days = parseInt(daysMatch[1] || daysMatch[2]);
            now.setDate(now.getDate() - days);
            return formatDate(now);
        }

        // "昨天 HH:MM", "yesterday HH:MM"
        if (/昨天|yesterday/i.test(cleaned)) {
            const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                now.setDate(now.getDate() - 1);
                now.setHours(parseInt(timeMatch[1]));
                now.setMinutes(parseInt(timeMatch[2]));
                now.setSeconds(0);
                return formatDate(now);
            }
        }

        // "今天 HH:MM", "today HH:MM"
        if (/今天|today/i.test(cleaned)) {
            const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                now.setHours(parseInt(timeMatch[1]));
                now.setMinutes(parseInt(timeMatch[2]));
                now.setSeconds(0);
                return formatDate(now);
            }
        }

        // Try to parse as Date
        const date = new Date(cleaned);
        if (!isNaN(date.getTime())) {
            return formatDate(date);
        }

        // Try ISO format variations
        const isoMatch = cleaned.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (isoMatch) {
            const [, year, month, day, hour = '00', minute = '00', second = '00'] = isoMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
        }

        // If all parsing fails, return cleaned string
        return cleaned;
    } catch (error) {
        console.warn('Time formatting error:', error, 'Input:', timeStr);
        return timeStr;
    }
}

/**
 * Formats a Date object to string (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Normalizes URL to absolute URL
 * @param {string} url - URL string (can be relative or absolute)
 * @param {string} baseUrl - Base URL for resolving relative URLs (optional)
 * @returns {string} Absolute URL
 */
function normalizeUrl(url, baseUrl = '') {
    if (!url) return '';

    try {
        // Already absolute URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Protocol-relative URL
        if (url.startsWith('//')) {
            return 'https:' + url;
        }

        // Relative URL
        if (baseUrl) {
            return new URL(url, baseUrl).href;
        }

        // Use current page as base
        if (typeof window !== 'undefined') {
            return new URL(url, window.location.href).href;
        }

        return url;
    } catch (error) {
        console.warn('URL normalization error:', error, 'Input:', url);
        return url;
    }
}

/**
 * Cleans and normalizes text content
 * @param {string} text - Raw text content
 * @returns {string} Cleaned text
 */
function cleanText(text) {
    if (!text) return '';

    return text
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .replace(/\u00A0/g, ' ')         // Replace &nbsp;
        .trim();
}

/**
 * Extracts and formats image data (only content images, not UI elements)
 * @param {HTMLImageElement} imgElement - Image element
 * @param {string} baseUrl - Base URL for relative URLs (optional)
 * @returns {Object} Image object matching ImageSchema
 */
function extractImage(imgElement, baseUrl = '') {
    if (!imgElement) return null;

    // Skip UI elements and non-content images
    // Split className into individual class names for exact matching
    const classNames = (imgElement.className || '').split(/\s+/).map(c => c.toLowerCase());
    const skipClasses = [
        'avatar', 'logo', 'icon', 'emoji', 'qrcode', 'ad',
        'banner', 'placeholder', 'blank', 'button', 'nav'
    ];

    // Use exact class name matching (not substring matching)
    for (const skipClass of skipClasses) {
        if (classNames.includes(skipClass)) {
            console.log("Skipping image due to class:", skipClass);
            return null;
        }
    }

    // Skip small images (likely icons or UI elements)
    // Only filter if we can determine the size AND it's small
    const width = parseInt(imgElement.width) || parseInt(imgElement.naturalWidth) ||
                  parseInt(imgElement.getAttribute('width')) || 0;
    const height = parseInt(imgElement.height) || parseInt(imgElement.naturalHeight) ||
                   parseInt(imgElement.getAttribute('height')) || 0;
    console.log("Image dimensions:", width, height);
    
    // Only skip if BOTH dimensions are set AND at least one is small
    if (width > 0 && height > 0) {
        if (width < 50 || height < 50) {
            return null;
        }
    }
    console.log("Image dimensions:", width, height);
    // Try multiple attributes for image source
    const src = imgElement.src ||
                imgElement.getAttribute('data-src') ||
                imgElement.getAttribute('data-original') ||
                imgElement.getAttribute('data-lazy-src') ||
                '';
    console.log(src);
    
    if (!src) return null;

    // Skip blank/placeholder images
    if (src.includes('blank.gif') ||
        src.includes('placeholder') ||
        src.includes('loading.gif') ||
        src.includes('data:image/svg')) {
        return null;
    }

    return {
        src: normalizeUrl(src, baseUrl),
        alt: cleanText(imgElement.alt || imgElement.getAttribute('title') || ''),
        width: width,
        height: height
    };
}

/**
 * Extracts and formats video data (only content videos, not ads or UI)
 * @param {HTMLVideoElement|HTMLElement} videoElement - Video or iframe element
 * @param {string} baseUrl - Base URL for relative URLs (optional)
 * @returns {Object} Video object matching VideoSchema
 */
function extractVideo(videoElement, baseUrl = '') {
    if (!videoElement) return null;

    // Skip ad videos and UI elements
    // Split className into individual class names for exact matching
    const classNames = (videoElement.className || '').split(/\s+/).map(c => c.toLowerCase());
    const skipClasses = ['ad', 'advertisement', 'banner', 'promo'];

    // Use exact class name matching (not substring matching)
    for (const skipClass of skipClasses) {
        if (classNames.includes(skipClass)) {
            return null;
        }
    }

    let src = '';
    let poster = '';
    let duration = 0;
    let title = '';

    if (videoElement.tagName === 'VIDEO') {
        src = videoElement.src || videoElement.getAttribute('data-src') || '';
        poster = videoElement.poster || '';
        duration = parseInt(videoElement.duration) || 0;
        title = videoElement.getAttribute('title') || '';
    } else if (videoElement.tagName === 'IFRAME') {
        src = videoElement.src || '';
        title = videoElement.getAttribute('title') || '';

        // Skip non-video iframes
        if (!src.includes('video') &&
            !src.includes('player') &&
            !src.includes('v.qq.com') &&
            !src.includes('youtube') &&
            !src.includes('youku') &&
            !src.includes('bilibili')) {
            return null;
        }
    } else {
        // Try to find source element or video tag inside
        const videoTag = videoElement.querySelector('video');
        if (videoTag) {
            return extractVideo(videoTag, baseUrl);
        }

        const sourceEl = videoElement.querySelector('source');
        if (sourceEl) {
            src = sourceEl.src || sourceEl.getAttribute('data-src') || '';
        }
    }

    if (!src) return null;

    return {
        src: normalizeUrl(src, baseUrl),
        poster: normalizeUrl(poster, baseUrl),
        duration: duration,
        title: cleanText(title)
    };
}

/**
 * Safe element query - tries multiple selectors
 * @param {Element} parent - Parent element to query
 * @param {string|Array} selectors - Single selector or array of selectors
 * @returns {Element|null} First matching element or null
 */
function safeQuery(parent, selectors) {
    if (!parent) return null;

    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
        try {
            const element = parent.querySelector(selector);
            if (element) return element;
        } catch (error) {
            console.warn('Query selector error:', error, 'Selector:', selector);
        }
    }

    return null;
}

/**
 * Safe element query all - tries multiple selectors
 * @param {Element} parent - Parent element to query
 * @param {string|Array} selectors - Single selector or array of selectors
 * @returns {Array} Array of matching elements
 */
function safeQueryAll(parent, selectors) {
    if (!parent) return [];

    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
        try {
            const elements = parent.querySelectorAll(selector);
            if (elements.length > 0) return Array.from(elements);
        } catch (error) {
            console.warn('Query selector error:', error, 'Selector:', selector);
        }
    }

    return [];
}

/**
 * Parses number from text (handles Chinese characters)
 * @param {string} text - Text containing number
 * @returns {number} Parsed number or 0
 */
function parseNumber(text) {
    if (!text) return 0;

    // Remove Chinese characters and whitespace
    const cleaned = text.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);

    // Handle Chinese number suffixes
    if (text.includes('万')) {
        return Math.floor(num * 10000);
    } else if (text.includes('千')) {
        return Math.floor(num * 1000);
    } else if (text.includes('百')) {
        return Math.floor(num * 100);
    }

    return Math.floor(num) || 0;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.formatTime = formatTime;
    window.formatDate = formatDate;
    window.normalizeUrl = normalizeUrl;
    window.cleanText = cleanText;
    window.extractImage = extractImage;
    window.extractVideo = extractVideo;
    window.safeQuery = safeQuery;
    window.safeQueryAll = safeQueryAll;
    window.parseNumber = parseNumber;
}
