// AiMaster Content Script
// Injected into web pages for platform detection, article crawling and publishing

console.log('AiMaster content script loaded');

// ============================================
// Platform Configuration
// ============================================
const PLATFORMS = {
    baidu: {
        name: 'Baidu News',
        match: (url) => url.includes('baijiahao.baidu.com') || url.includes('baidu.com/s?'),
        crawler: null,
        publisher: null
    },
    pengpai: {
        name: 'Pengpai News',
        match: (url) => url.includes('thepaper.cn'),
        crawler: null,
        publisher: null
    },
    sohu: {
        name: 'Sohu News',
        match: (url) => url.includes('sohu.com'),
        crawler: null,
        publisher: null
    },
    tencent: {
        name: 'Tencent News',
        match: (url) => url.includes('qq.com/') && (url.includes('/omn/') || url.includes('/rain/')),
        crawler: null,
        publisher: null
    },
    netease: {
        name: 'NetEase News',
        match: (url) => url.includes('163.com'),
        crawler: null,
        publisher: null
    },
    chinadaily: {
        name: 'China Daily',
        match: (url) => url.includes('chinadaily.com'),
        crawler: null,
        publisher: null
    },
    toutiao: {
        name: 'Toutiao',
        match: (url) => url.includes('toutiao.com'),
        crawler: null,
        publisher: null
    },
    weixin: {
        name: 'WeChat Official Account',
        match: (url) => url.includes('mp.weixin.qq.com'),
        crawler: null,
        publisher: null
    }
};

// Initialize crawlers from modules
if (typeof window.BaiduCrawler !== 'undefined') {
    PLATFORMS.baidu.crawler = () => window.BaiduCrawler.crawl();
}
if (typeof window.PengpaiCrawler !== 'undefined') {
    PLATFORMS.pengpai.crawler = () => window.PengpaiCrawler.crawl();
}
if (typeof window.SohuCrawler !== 'undefined') {
    PLATFORMS.sohu.crawler = () => window.SohuCrawler.crawl();
}
if (typeof window.TencentCrawler !== 'undefined') {
    PLATFORMS.tencent.crawler = () => window.TencentCrawler.crawl();
}
if (typeof window.NeteaseCrawler !== 'undefined') {
    PLATFORMS.netease.crawler = () => window.NeteaseCrawler.crawl();
}
if (typeof window.ChinaDailyCrawler !== 'undefined') {
    PLATFORMS.chinadaily.crawler = () => window.ChinaDailyCrawler.crawl();
}
if (typeof window.ToutiaoCrawler !== 'undefined') {
    PLATFORMS.toutiao.crawler = () => window.ToutiaoCrawler.crawl();
}

// ============================================
// Platform Detection
// ============================================
function detectPlatform() {
    const url = window.location.href;

    for (const [key, platform] of Object.entries(PLATFORMS)) {
        if (platform.match(url)) {
            return {
                platform: key,
                platformName: platform.name
            };
        }
    }

    return {
        platform: 'unknown',
        platformName: 'Unknown Platform'
    };
}

// ============================================
// NetEase News Crawler
// Moved to crawlers/netease.js module
// ============================================

// ============================================
// Toutiao Crawler
// Moved to crawlers/toutiao.js module
// ============================================

// ============================================
// Tencent News Crawler
// Moved to crawlers/tencent.js module
// ============================================

// ============================================
// WeChat Official Account Crawler
// ============================================
PLATFORMS.weixin.crawler = function() {
    try {
        const article = {
            title: '',
            content: '',
            author: '',
            publishTime: '',
            images: []
        };

        article.title = document.querySelector('#activity-name')?.textContent?.trim() ||
                       document.querySelector('.rich_media_title')?.textContent?.trim() ||
                       '';

        const contentEl = document.querySelector('#js_content') ||
                         document.querySelector('.rich_media_content');

        if (contentEl) {
            const sections = Array.from(contentEl.querySelectorAll('section, p'));
            article.content = sections
                .map(el => el.textContent.trim())
                .filter(text => text.length > 0)
                .join('\n\n');

            const images = Array.from(contentEl.querySelectorAll('img'));
            article.images = images.map(img => ({
                src: img.getAttribute('data-src') || img.src,
                alt: img.alt || ''
            }));
        }

        article.author = document.querySelector('#js_name')?.textContent?.trim() ||
                        document.querySelector('.rich_media_meta_text')?.textContent?.trim() ||
                        'Unknown';

        article.publishTime = document.querySelector('#publish_time')?.textContent?.trim() || '';

        if (!article.title || !article.content) {
            throw new Error('Failed to extract complete article information');
        }

        return article;
    } catch (error) {
        console.error('WeChat crawler failed:', error);
        throw error;
    }
};

// ============================================
// Generic Publisher for Editors
// ============================================
function publishToEditor(article, platform) {
    try {
        console.log('Publishing article to editor:', platform);

        let titleInput, contentEditor;

        // Select different selectors based on platform
        switch (platform) {
            case 'weixin':
                // WeChat Official Account Editor
                titleInput = document.querySelector('#title') ||
                           document.querySelector('.title-input') ||
                           document.querySelector('input[placeholder*="标题"]');

                contentEditor = document.querySelector('#ueditor_0') ||
                              document.querySelector('.edui-body-container') ||
                              document.querySelector('.editor-content');
                break;

            case 'toutiao':
                // Toutiao Editor
                titleInput = document.querySelector('.title-input') ||
                           document.querySelector('input[placeholder*="标题"]');

                contentEditor = document.querySelector('.ql-editor') ||
                              document.querySelector('.editor-container');
                break;

            default:
                // Generic editor detection
                titleInput = document.querySelector('input[type="text"]') ||
                           document.querySelector('.title-input');

                contentEditor = document.querySelector('.editor') ||
                              document.querySelector('[contenteditable="true"]');
        }

        if (!titleInput && !contentEditor) {
            throw new Error('Editor not found, please ensure you are on an editor page');
        }

        // Fill title
        if (titleInput) {
            titleInput.value = article.title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Fill content
        if (contentEditor) {
            if (contentEditor.contentEditable === 'true') {
                contentEditor.innerHTML = article.content.split('\n\n')
                    .map(p => `<p>${p}</p>`)
                    .join('');
            } else {
                contentEditor.textContent = article.content;
            }

            contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
            contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
            contentEditor.focus();
        }

        console.log('Article successfully inserted into editor');
        return true;
    } catch (error) {
        console.error('Publishing to editor failed:', error);
        throw error;
    }
}

// Set publishers for all platforms
PLATFORMS.weixin.publisher = (article) => publishToEditor(article, 'weixin');
PLATFORMS.toutiao.publisher = (article) => publishToEditor(article, 'toutiao');

// ============================================
// Message Listener
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('=== Content script 收到消息 ===');
    console.log('消息类型:', request.action);
    console.log('完整消息:', request);

    switch (request.action) {
        case 'detectPlatform':
            const platformInfo = detectPlatform();
            console.log('检测到平台:', platformInfo);
            sendResponse(platformInfo);
            break;

        case 'crawlArticle':
            console.log('=== 开始爬取文章 ===');
            try {
                const platform = detectPlatform();
                console.log('当前平台:', platform);

                if (platform.platform === 'unknown') {
                    console.error('不支持的平台');
                    sendResponse({ success: false, error: 'Unsupported platform' });
                    return;
                }

                const platformConfig = PLATFORMS[platform.platform];
                console.log('平台配置:', {
                    name: platformConfig.name,
                    hasCrawler: !!platformConfig.crawler
                });

                if (!platformConfig.crawler) {
                    console.error('该平台暂未实现爬虫功能');
                    sendResponse({ success: false, error: 'Crawler not implemented for this platform' });
                    return;
                }

                console.log('调用爬虫函数...');
                const article = platformConfig.crawler();
                console.log('爬取成功，数据:', {
                    title: article.title,
                    author: article.author,
                    contentLength: article.contents?.length || article.content?.length || 0,
                    imagesCount: article.images?.length || 0,
                    commentsCount: article.commentCount || 0
                });
                console.log('完整文章数据:', article);

                sendResponse({
                    success: true,
                    platform: platform.platform,
                    platformName: platform.platformName,
                    article: article
                });
            } catch (error) {
                console.error('=== 爬取失败 ===');
                console.error('错误类型:', error.name);
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
            break;

        case 'publishArticle':
            console.log('=== 开始发布文章 ===');
            try {
                const targetPlatform = request.platform === 'auto'
                    ? detectPlatform().platform
                    : request.platform;

                console.log('目标平台:', targetPlatform);

                const platformConfig = PLATFORMS[targetPlatform];

                if (!platformConfig || !platformConfig.publisher) {
                    console.error('当前平台不支持自动发布');
                    sendResponse({
                        success: false,
                        error: 'Auto-publish not supported for this platform, please copy manually'
                    });
                    return;
                }

                console.log('调用发布函数...');
                platformConfig.publisher(request.article);
                console.log('发布成功');
                sendResponse({ success: true });
            } catch (error) {
                console.error('=== 发布失败 ===');
                console.error('错误类型:', error.name);
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
            break;

        default:
            console.warn('未知的消息类型:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }

    return true;
});

console.log('AiMaster content script ready');
