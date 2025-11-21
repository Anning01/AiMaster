// Baidu News Crawler Module
// Extract article and comments from Baidu news pages

const BaiduCrawler = {
    name: 'Baidu News',

    // Platform detection
    match: (url) => {
        return url.includes('baijiahao.baidu.com') || url.includes('baidu.com/s?');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== Baidu 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                '.sKHSJ',
                'h1[class*="title"]',
                '.article-title',
                'h1'
            ]);
            if (titleEl) {
                article.title = cleanText(titleEl.textContent);
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract author info
            console.log('提取作者信息...');
            const authorLinkEl = safeQuery(document, [
                'a[href*="author.baidu.com"]',
                'a[href*="baijiahao"]',
                '[class*="author"] a'
            ]);
            if (authorLinkEl) {
                article.author.url = normalizeUrl(authorLinkEl.href);
            }

            const authorNameEl = safeQuery(document, [
                'p[data-testid="author-name"]',
                'p._2gGWi',
                '[class*="author-name"]',
                '[class*="author"] [class*="name"]'
            ]);
            if (authorNameEl) {
                article.author.nickname = cleanText(authorNameEl.textContent);
                console.log('作者:', article.author.nickname, '链接:', article.author.url);
            } else {
                console.warn('未找到作者名称元素');
            }

            // Extract author avatar
            const avatarImg = safeQuery(document, [
                '[class*="author"] img',
                'img[class*="avatar"]',
                '[class*="author-info"] img'
            ]);
            if (avatarImg) {
                article.author.avatar = normalizeUrl(avatarImg.src);
            }

            // Extract publish time
            const timeEl = safeQuery(document, [
                '._2sjh9[data-testid="updatetime"]',
                '[data-testid="updatetime"]',
                '[class*="time"]',
                'time'
            ]);
            if (timeEl) {
                article.publishTime = formatTime(timeEl.textContent);
                console.log('发布时间:', article.publishTime);
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                '._18p7x[data-testid="article"]',
                '[data-testid="article"]',
                'article',
                '.article-content'
            ]);
            
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - use stable bjh-p class instead of dynamic hash classes
                // Baidu uses <span class="bjh-p"> for content paragraphs
                const paragraphSpans = safeQueryAll(contentEl, [
                    'span.bjh-p',
                    'span[class*="bjh-"]',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphSpans.length);

                paragraphSpans.forEach((span) => {
                    const text = cleanText(span.textContent);
                    // Skip very short text (likely labels or markers)
                    if (text && text.length > 10) {
                        article.contentList.push(text);
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - avoid dynamic class names
                const images = safeQueryAll(contentEl, [
                    'img:not([class*="avatar"])',
                    'img'
                ]);
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    const imageObj = extractImage(img);
                    if (imageObj && imageObj.src) {
                        article.imageList.push(imageObj);
                    }
                });
                console.log('提取图片数量:', article.imageList.length);

                // Extract videos - using unified format
                const videos = safeQueryAll(contentEl, [
                    'video',
                    'iframe[src*="video"]',
                    'iframe[src*="player"]'
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
            const commentData = BaiduCrawler.crawlComments();
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

            console.log('=== Baidu 爬虫完成 ===');
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
            console.error('=== Baidu 爬虫失败 ===');
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
            // Get comment count - using stable selectors
            const countEl = safeQuery(document, [
                '.xcp-publish-title[data-testid="xcp-publish-new-title"]',
                '[data-testid*="title"]',
                '[class*="comment"] [class*="title"]'
            ]);
            if (countEl) {
                const countText = countEl.textContent.trim();
                const countMatch = countText.match(/评论\s*(\d+)|(\d+)\s*条/);
                if (countMatch) {
                    result.count = parseInt(countMatch[1] || countMatch[2]) || 0;
                    console.log('评论总数:', result.count);
                }
            } else {
                console.warn('未找到评论计数元素');
            }

            // Get comment list - using stable selectors
            const commentItems = safeQueryAll(document, [
                '.xcp-item',
                '[class*="comment-item"]'
            ]);
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                // Avatar - using unified schema
                let avatar = '';
                const avatarEl = safeQuery(item, [
                    '.x-avatar-img',
                    'img[class*="avatar"]',
                    '[class*="avatar"]'
                ]);
                if (avatarEl) {
                    if (avatarEl.tagName === 'IMG') {
                        avatar = normalizeUrl(avatarEl.src);
                    } else {
                        // Background image case
                        const bgImage = avatarEl.style.backgroundImage;
                        if (bgImage) {
                            avatar = normalizeUrl(bgImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1'));
                        }
                    }
                }

                // Nickname
                const nicknameEl = safeQuery(item, [
                    '.user-bar-uname',
                    '[class*="uname"]',
                    '[class*="nickname"]'
                ]);
                const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                // Content
                const contentEl = safeQuery(item, [
                    '.x-interact-rich-text',
                    '[class*="rich-text"]',
                    '[class*="content"]'
                ]);
                const content = contentEl ? cleanText(contentEl.textContent) : '';

                // Time
                const timeEl = safeQuery(item, [
                    '.time',
                    '[class*="time"]'
                ]);
                const publishTime = timeEl ? formatTime(timeEl.textContent) : '';

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
                        [] // Baidu comments don't have nested replies in this structure
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
        return BaiduCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.BaiduCrawler = BaiduCrawler;
}
