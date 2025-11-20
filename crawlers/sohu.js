// Sohu News Crawler Module
// Extract article and comments from Sohu news pages

const SohuCrawler = {
    name: 'Sohu News',

    // Platform detection
    match: (url) => {
        return url.includes('sohu.com');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== Sohu 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                '.text-title h1',
                'h1[class*="title"]',
                'h1.title',
                'h1'
            ]);
            if (titleEl) {
                article.title = cleanText(titleEl.textContent);
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract publish time
            console.log('提取元信息...');
            const timeEl = safeQuery(document, [
                '#news-time',
                '.time',
                '[class*="time"]',
                'time'
            ]);
            if (timeEl) {
                article.publishTime = formatTime(timeEl.textContent);
                console.log('发布时间:', article.publishTime);
            } else {
                console.warn('未找到时间元素');
            }

            // Extract source (optional - some pages don't have it)
            const sourceEl = safeQuery(document, [
                '[data-role="original-link"]',
                '[class*="source"]'
            ]);
            if (sourceEl) {
                const sourceName = cleanText(sourceEl.textContent.replace('来源:', ''));
                article.author.nickname = sourceName;
                if (sourceEl.tagName === 'A') {
                    article.author.url = normalizeUrl(sourceEl.href);
                }
                console.log('来源:', sourceName);
            } else {
                console.warn('未找到来源元素 (某些页面可能没有来源信息)');
                // Set default author if no source found
                article.author.nickname = 'Sohu';
            }

            // Extract article content - support multiple formats
            console.log('提取文章内容...');
            let contentEl = safeQuery(document, [
                '#mp-editor',
                'article.article',
                '.article-content',
                '[class*="content"]'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - exclude editor name and return links
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not([data-role="editor-name"])',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    // Skip if contains "返回搜狐" link
                    if (p.querySelector('#backsohucom')) {
                        console.log(`段落 #${index + 1} 包含返回链接，跳过`);
                        return;
                    }

                    const text = cleanText(p.textContent);
                    if (text && text.length > 10) {
                        article.contentList.push(text);
                        console.log(`段落 #${index + 1}:`, text.substring(0, 50) + '...');
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - only real article images, using unified format
                const images = safeQueryAll(contentEl, [
                    'img:not([src*="preload.png"]):not([src*="icon_"]):not([src*="logo_sohu"])',
                    'img'
                ]);
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
                    // Skip data:image, preload images, and sohu icons
                    if (src &&
                        !src.startsWith('data:image') &&
                        !src.includes('preload.png') &&
                        !src.includes('icon_') &&
                        !src.includes('logo_sohu')) {
                        const imageObj = extractImage(img);
                        if (imageObj && imageObj.src) {
                            article.imageList.push(imageObj);
                        }
                    }
                });
                console.log('提取图片数量:', article.imageList.length);

                // Extract videos - using unified format
                const videos = safeQueryAll(contentEl, [
                    'video',
                    'iframe[src*="video"]',
                    '[class*="video"]'
                ]);
                console.log('找到视频数量:', videos.length);

                videos.forEach((video) => {
                    const videoObj = extractVideo(video);
                    if (videoObj && videoObj.src) {
                        article.videoList.push(videoObj);
                    }
                });
                console.log('提取视频数量:', article.videoList.length);
            } else {
                console.error('未找到内容容器');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = SohuCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.commentList = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.commentList.length);

            // Validate using unified schema
            const validation = validateArticle(article);
            if (!validation.valid) {
                console.error('数据验证失败:', validation.errors);
                throw new Error('Article data validation failed: ' + validation.errors.join(', '));
            }

            console.log('=== Sohu 爬虫完成 ===');
            console.log('最终数据摘要:', {
                url: article.url,
                title: article.title,
                author: article.author.nickname,
                publishTime: article.publishTime,
                paragraphs: article.contentList.length,
                images: article.imageList.length,
                videos: article.videoList.length,
                comments: article.commentList.length
            });

            return article;
        } catch (error) {
            console.error('=== Sohu 爬虫失败 ===');
            console.error('错误类型:', error.name);
            console.error('错误消息:', error.message);
            console.error('错误堆栈:', error.stack);
            throw error;
        }
    },

    // Extract comments (using unified schema)
    crawlComments: () => {
        console.log('--- 开始提取评论 ---');

        const result = {
            count: 0,
            list: []
        };

        try {
            // Try to find comment count - use more specific selector
            const countEl = safeQuery(document, [
                '.comment-count',
                '[class*="comment-count"]',
                '[class*="count"]'
            ]);
            if (countEl) {
                result.count = parseNumber(countEl.textContent);
                console.log('评论总数:', result.count);
            } else {
                console.warn('未找到评论计数元素');
            }

            // Find comment items - support multiple formats
            let commentItems = safeQueryAll(document, [
                '.comment-item[data-v-586d6cf8]',
                '.comment-item',
                '[class*="comment-item"]'
            ]);
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                // Avatar - using unified schema
                const avatarImg = safeQuery(item, [
                    '.left img',
                    'img[class*="avatar"]',
                    '.avatar img',
                    'img'
                ]);
                const avatar = avatarImg ? normalizeUrl(avatarImg.src) : '';

                // Nickname
                const nicknameEl = safeQuery(item, [
                    '.author-area.name span',
                    '[class*="author"] span',
                    '[class*="name"]'
                ]);
                const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                // Time and location
                let publishTime = '';
                const tagEls = safeQueryAll(item, [
                    '.comment-tag .plain-tag',
                    '[class*="tag"]'
                ]);
                if (tagEls.length >= 1) {
                    publishTime = formatTime(tagEls[0].textContent);
                }

                // Content
                const contentEl = safeQuery(item, [
                    '.comment-content-text',
                    '[class*="content-text"]',
                    '[class*="content"]'
                ]);
                const content = contentEl ? cleanText(contentEl.textContent) : '';

                console.log(`评论 #${index + 1}:`, {
                    nickname: nickname,
                    content: content.substring(0, 30) + '...',
                    time: publishTime
                });

                // Only add if we have basic info - using unified schema
                if (nickname && content) {
                    result.list.push(createComment(
                        avatar,
                        nickname,
                        publishTime,
                        content,
                        [] // Sohu comments typically don't have nested replies
                    ));
                } else {
                    console.warn(`评论 #${index + 1} 数据不完整，跳过`);
                }
            });

            console.log('--- 评论提取完成 ---');
            console.log('成功提取评论数:', result.list.length);

        } catch (error) {
            console.error('提取评论失败:', error);
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }

        return result;
    },

    // Get full article data (article + comments)
    crawl: () => {
        return SohuCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.SohuCrawler = SohuCrawler;
}
