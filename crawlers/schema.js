// Unified News Data Schema
// Defines the standard data structure for all news crawlers

/**
 * Unified News Article Schema
 * All crawlers must return data in this format
 */
const NewsArticleSchema = {
    // Basic article info
    url: '',                    // Article URL
    title: '',                  // Article title
    publishTime: '',            // Publish time in format: YYYY-MM-DD HH:MM:SS

    // Author information
    author: {
        avatar: '',             // Author avatar URL
        nickname: '',           // Author nickname/name
        url: ''                 // Author profile URL
    },

    // Content arrays (segmented)
    contentList: [],            // Array of text paragraphs (strings)
    imageList: [],              // Array of image objects
    videoList: [],              // Array of video objects

    // Comment information
    commentCount: 0,            // Total comment count
    commentList: []             // Array of comment objects (tree structure)
};

/**
 * Image Object Schema
 */
const ImageSchema = {
    src: '',                    // Image source URL
    alt: '',                    // Image alt text (optional)
    width: 0,                   // Image width (optional)
    height: 0                   // Image height (optional)
};

/**
 * Video Object Schema
 */
const VideoSchema = {
    src: '',                    // Video source URL
    poster: '',                 // Video poster/thumbnail URL (optional)
    duration: 0,                // Video duration in seconds (optional)
    title: ''                   // Video title (optional)
};

/**
 * Comment Object Schema (supports tree structure)
 */
const CommentSchema = {
    avatar: '',                 // Commenter avatar URL
    nickname: '',               // Commenter nickname
    publishTime: '',            // Comment publish time (YYYY-MM-DD HH:MM:SS)
    content: '',                // Comment content text
    children: []                // Array of child comments (for nested replies)
};

/**
 * Creates an empty news article object with the unified schema
 * @returns {Object} Empty article object
 */
function createEmptyArticle() {
    return {
        url: '',
        title: '',
        publishTime: '',
        author: {
            avatar: '',
            nickname: '',
            url: ''
        },
        contentList: [],
        imageList: [],
        videoList: [],
        commentCount: 0,
        commentList: []
    };
}

/**
 * Creates an image object
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text (optional)
 * @param {number} width - Width (optional)
 * @param {number} height - Height (optional)
 * @returns {Object} Image object
 */
function createImage(src, alt = '', width = 0, height = 0) {
    return {
        src: src || '',
        alt: alt || '',
        width: width || 0,
        height: height || 0
    };
}

/**
 * Creates a video object
 * @param {string} src - Video source URL
 * @param {string} poster - Poster URL (optional)
 * @param {number} duration - Duration in seconds (optional)
 * @param {string} title - Video title (optional)
 * @returns {Object} Video object
 */
function createVideo(src, poster = '', duration = 0, title = '') {
    return {
        src: src || '',
        poster: poster || '',
        duration: duration || 0,
        title: title || ''
    };
}

/**
 * Creates a comment object
 * @param {string} avatar - Commenter avatar URL
 * @param {string} nickname - Commenter nickname
 * @param {string} publishTime - Publish time
 * @param {string} content - Comment content
 * @param {Array} children - Child comments (optional)
 * @returns {Object} Comment object
 */
function createComment(avatar, nickname, publishTime, content, children = []) {
    return {
        avatar: avatar || '',
        nickname: nickname || '',
        publishTime: publishTime || '',
        content: content || '',
        children: children || []
    };
}

/**
 * Validates if an article object matches the schema
 * @param {Object} article - Article object to validate
 * @returns {Object} Validation result {valid: boolean, errors: Array}
 */
function validateArticle(article) {
    const errors = [];

    if (!article) {
        return { valid: false, errors: ['Article object is null or undefined'] };
    }

    // Required fields
    if (!article.url) errors.push('Missing required field: url');
    if (!article.title) errors.push('Missing required field: title');
    if (!article.publishTime) errors.push('Missing required field: publishTime');

    // Author object
    if (!article.author || typeof article.author !== 'object') {
        errors.push('Missing or invalid author object');
    } else {
        if (!article.author.nickname) errors.push('Missing author.nickname');
    }

    // Arrays
    if (!Array.isArray(article.contentList)) errors.push('contentList must be an array');
    if (!Array.isArray(article.imageList)) errors.push('imageList must be an array');
    if (!Array.isArray(article.videoList)) errors.push('videoList must be an array');
    if (!Array.isArray(article.commentList)) errors.push('commentList must be an array');

    // Comment count
    if (typeof article.commentCount !== 'number') {
        errors.push('commentCount must be a number');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.NewsArticleSchema = NewsArticleSchema;
    window.createEmptyArticle = createEmptyArticle;
    window.createImage = createImage;
    window.createVideo = createVideo;
    window.createComment = createComment;
    window.validateArticle = validateArticle;
}
