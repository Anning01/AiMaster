# Crawler Modules

This folder contains platform-specific crawler modules. Each platform has its own dedicated crawler file for easier maintenance and updates.

## Structure

```
crawlers/
├── toutiao.js      # Toutiao (Jinri Toutiao) crawler
├── netease.js      # NetEase News crawler (TODO)
├── tencent.js      # Tencent News crawler (TODO)
└── weixin.js       # WeChat Official Account crawler (TODO)
```

## Toutiao Crawler

**File:** `toutiao.js`

**Status:** ✅ Completed

### Extracted Data

The Toutiao crawler extracts the following information:

**Article Data:**
- `title` - Article title
- `publishTime` - Publish date and time
- `author` - Author name
- `authorUrl` - Author profile URL
- `contents[]` - Array of content paragraphs with type and data-track attribute
- `images[]` - Array of images with src, alt, and data-src
- `videos[]` - Array of videos with src, poster, and type

**Comment Data:**
- `commentCount` - Total number of comments
- `comments[]` - Array of comment objects containing:
  - `userId` - User ID
  - `userUrl` - User profile URL
  - `avatar` - User avatar image URL
  - `nickname` - User nickname
  - `content` - Comment content
  - `time` - Comment time
  - `likes` - Number of likes
  - `replyCount` - Number of replies
  - `replies[]` - Array of reply objects (can be extended)

### Usage

The crawler is automatically loaded and initialized by `content.js`. It will be used when visiting Toutiao article pages.

### Selectors Used

- Title: `.article-content h1`
- Meta info: `.article-meta`
- Content: `article.syl-article-base p`
- Images: `article.syl-article-base img`
- Videos: `article.syl-article-base video, iframe[src*="video"]`
- Comment count: `.ttp-comment-wrapper .title span`
- Comment items: `.comment-list > li`

## Adding New Crawlers

To add a new platform crawler:

1. Create a new file: `crawlers/yourplatform.js`
2. Follow this template:

```javascript
const YourPlatformCrawler = {
    name: 'Platform Name',

    match: (url) => {
        return url.includes('yourplatform.com');
    },

    crawlArticle: () => {
        // Extract article data
        return {
            title: '',
            publishTime: '',
            author: '',
            contents: [],
            images: [],
            videos: [],
            commentCount: 0,
            comments: []
        };
    },

    crawl: () => {
        return YourPlatformCrawler.crawlArticle();
    }
};

if (typeof window !== 'undefined') {
    window.YourPlatformCrawler = YourPlatformCrawler;
}
```

3. Add the crawler to `manifest.json`:

```json
"content_scripts": [
    {
        "matches": ["https://*/*"],
        "js": [
            "crawlers/toutiao.js",
            "crawlers/yourplatform.js",
            "content.js"
        ],
        "run_at": "document_idle"
    }
]
```

4. Initialize in `content.js`:

```javascript
PLATFORMS.yourplatform = {
    name: 'Platform Name',
    match: (url) => url.includes('yourplatform.com'),
    crawler: null,
    publisher: null
};

if (typeof window.YourPlatformCrawler !== 'undefined') {
    PLATFORMS.yourplatform.crawler = () => window.YourPlatformCrawler.crawl();
}
```

## Testing

To test a crawler:

1. Load the extension in Chrome
2. Visit a target article page
3. Open Chrome DevTools Console
4. Test the crawler manually:

```javascript
// For Toutiao
const result = ToutiaoCrawler.crawl();
console.log(result);
```

## Notes

- Each crawler module is loaded before `content.js`
- Crawlers should handle errors gracefully and throw meaningful error messages
- Always validate that essential fields (title, content) are extracted
- Use consistent data structures across all crawlers
