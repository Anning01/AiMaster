// NetEase News Crawler Module
// Extract article and comments from NetEase news pages

const NeteaseCrawler = {
    name: 'NetEase News',

    // Platform detection
    match: (url) => {
        return url.includes('163.com');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== NetEase 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                'h1',
                '.post_title',
                '.title',
                'h1[class*="title"]'
            ]);
            if (titleEl) {
                article.title = cleanText(titleEl.textContent);
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract publish time - try multiple methods
            console.log('提取发布时间...');

            // Method 1: Try data-publishtime attribute on html or body
            let timeStr = document.documentElement.getAttribute('data-publishtime') ||
                         document.documentElement.getAttribute('data-ptime') ||
                         document.body?.getAttribute('data-ptime');

            // Method 2: Try meta tag
            if (!timeStr) {
                const metaTime = safeQuery(document, [
                    'meta[property="article:published_time"]',
                    'meta[name="publishdate"]'
                ]);
                if (metaTime) {
                    timeStr = metaTime.getAttribute('content');
                }
            }

            // Method 3: Try wrapper div
            if (!timeStr) {
                const wrapperEl = safeQuery(document, [
                    '#contain[data-ptime]',
                    '[data-ptime]',
                    '.wrapper[data-ptime]'
                ]);
                if (wrapperEl) {
                    timeStr = wrapperEl.getAttribute('data-ptime');
                }
            }

            // Method 4: Try info element
            if (!timeStr) {
                const infoEl = safeQuery(document, [
                    '.post_info',
                    '.post-info',
                    '.article-info',
                    '[class*="info"]'
                ]);

                if (infoEl) {
                    const timeEl = safeQuery(infoEl, [
                        '.post_time',
                        '[class*="time"]',
                        'time',
                        'span:first-child'
                    ]);
                    if (timeEl) {
                        timeStr = timeEl.textContent;
                    }
                }
            }

            if (timeStr) {
                article.publishTime = formatTime(timeStr);
                console.log('发布时间:', article.publishTime);
            } else {
                console.warn('未找到发布时间');
            }

            // Extract author
            console.log('提取作者信息...');
            const infoEl = safeQuery(document, [
                '.post_info',
                '.post-info',
                '.article-info',
                '[class*="info"]'
            ]);

            if (infoEl) {
                const authorEl = safeQuery(infoEl, [
                    '.post_author',
                    '[class*="author"]',
                    'a'
                ]);
                if (authorEl) {
                    article.author.nickname = cleanText(authorEl.textContent);
                    if (authorEl.tagName === 'A') {
                        article.author.url = normalizeUrl(authorEl.href);
                    }
                    console.log('作者:', article.author.nickname);
                }
            } else {
                console.warn('未找到作者信息容器');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                '.post_body',      // Most precise - excludes .post_next recommendations
                '.post_text',
                '.post_main',      // Fallback - includes .post_next
                '#content',
                'article',
                '[class*="content"]'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - using unified format
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not(.ep-source)',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphs.length);

                // Find where content ends (before disclaimers/comments)
                let stopAdding = false;

                paragraphs.forEach((p) => {
                    const text = cleanText(p.textContent);

                    // Stop if we hit disclaimer or comment section
                    if (text.includes('特别声明') ||
                        text.includes('Notice: The content above') ||
                        text.includes('网友评论仅供') ||
                        text.includes('仅提供信息存储服务') ||
                        p.classList.contains('tie-reminder')) {
                        stopAdding = true;
                        return;
                    }

                    // Skip if already in disclaimer/comment area
                    if (stopAdding) {
                        return;
                    }

                    // Only add non-empty paragraphs
                    if (text &&
                        text.length > 10 &&
                        !p.classList.contains('ep-source') &&
                        !text.match(/^\d{4}-\d{2}-\d{2}/) && // Skip dates
                        !text.includes('跟贴') &&
                        !text.includes('参与')) {
                        article.contentList.push(text);
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - using unified format
                const images = safeQueryAll(contentEl, [
                    'img:not([src*="blank.gif"])',
                    'img'
                ]);
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    // Skip blank placeholder images
                    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-echo');
                    if (src && !src.includes('blank.gif')) {
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
                    '[class*="video"]',
                    'iframe[src*="video"]'
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
            const commentData = NeteaseCrawler.crawlComments();
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

            console.log('=== NetEase 爬虫完成 ===');
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
            console.error('=== NetEase 爬虫失败 ===');
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
            // NetEase comments are often loaded dynamically
            const commentContainer = safeQuery(document, [
                '#comment',
                '.comment-list',
                '[class*="comment"]'
            ]);

            if (commentContainer) {
                // Try to find comment count
                const countEl = safeQuery(commentContainer, [
                    '[class*="count"]',
                    '[class*="total"]',
                    '.title span'
                ]);
                if (countEl) {
                    result.count = parseNumber(countEl.textContent);
                    console.log('评论总数:', result.count);
                } else {
                    console.warn('未找到评论计数元素');
                }

                // Try to find comment items
                const commentItems = safeQueryAll(commentContainer, [
                    '[class*="item"]',
                    'li',
                    '[class*="comment"]'
                ]);
                console.log('找到评论项数量:', commentItems.length);

                commentItems.forEach((item, index) => {
                    console.log(`处理评论 #${index + 1}...`);

                    // Avatar
                    const avatarImg = safeQuery(item, [
                        'img[class*="avatar"]',
                        '.avatar img',
                        'img'
                    ]);
                    const avatar = avatarImg ? normalizeUrl(avatarImg.src) : '';

                    // Nickname
                    const nicknameEl = safeQuery(item, [
                        '[class*="name"]',
                        '[class*="user"]',
                        '.nick'
                    ]);
                    const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                    // Content
                    const contentEl = safeQuery(item, [
                        '[class*="content"]',
                        '[class*="text"]',
                        '.txt'
                    ]);
                    const content = contentEl ? cleanText(contentEl.textContent) : '';

                    // Time
                    const timeEl = safeQuery(item, [
                        '[class*="time"]',
                        '.time',
                        'time'
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
                            [] // NetEase comments typically don't have nested replies
                        ));
                    } else {
                        console.warn(`评论 #${index + 1} 数据不完整，跳过`);
                    }
                });
            } else {
                console.warn('未找到评论容器');
            }

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
        return NeteaseCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.NeteaseCrawler = NeteaseCrawler;
}
