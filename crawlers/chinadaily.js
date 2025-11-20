// China Daily Crawler Module
// Extract article and comments from China Daily news pages

const ChinaDailyCrawler = {
    name: 'China Daily',

    // Platform detection
    match: (url) => {
        return url.includes('chinadaily.com.cn') || url.includes('chinadaily.cn');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== China Daily 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements (avoid .Artical_Title which contains ads)
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                '.Artical_Title h1',     // h1 inside .Artical_Title (not the container itself)
                'h1',
                '.article-title',
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
            let timeStr = '';

            // Method 1: Try meta tag
            const metaTime = safeQuery(document, [
                'meta[name="publishdate"]',
                'meta[property="article:published_time"]'
            ]);
            if (metaTime) {
                timeStr = metaTime.getAttribute('content');
            }

            // Method 2: Try date element in page
            if (!timeStr) {
                const dateEl = safeQuery(document, [
                    '.Artical_Share_Date',
                    '[class*="Date"]',
                    '[class*="date"]',
                    '[class*="time"]',
                    'time'
                ]);
                if (dateEl) {
                    timeStr = dateEl.textContent;
                }
            }

            // Method 3: Try info container
            if (!timeStr) {
                const infoEl = safeQuery(document, [
                    '.info',
                    '.article-info',
                    '.Artical_Info',
                    '[class*="info"]'
                ]);

                if (infoEl) {
                    const timeEl = safeQuery(infoEl, [
                        '[class*="time"]',
                        '.date',
                        'time',
                        'span'
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

            // Extract author - try multiple methods
            console.log('提取作者信息...');

            // Method 1: Try meta tag
            let authorName = '';
            const metaAuthor = safeQuery(document, ['meta[name="author"]']);
            if (metaAuthor) {
                authorName = metaAuthor.getAttribute('content');
            }

            // Method 2: Try page elements
            if (!authorName) {
                const infoEl = safeQuery(document, [
                    '.info',
                    '.article-info',
                    '.Artical_Info',
                    '[class*="info"]'
                ]);

                if (infoEl) {
                    const authorEl = safeQuery(infoEl, [
                        '[class*="author"]',
                        '[class*="source"]',
                        'a',
                        'span'
                    ]);
                    if (authorEl) {
                        authorName = cleanText(authorEl.textContent);
                        if (authorEl.tagName === 'A') {
                            article.author.url = normalizeUrl(authorEl.href);
                        }
                    }
                }
            }

            // Method 3: Use site name as fallback
            if (!authorName) {
                authorName = 'China Daily';
            }

            article.author.nickname = cleanText(authorName);
            console.log('作者:', article.author.nickname);

            // Extract article content (use #Content to exclude .Artical_Title ads)
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                '#Content',              // Most precise - excludes .Artical_Title
                '.Artical_Content',
                '.Artical_Body_Left',    // Fallback - may include ads
                'article',
                '[class*="article-content"]',
                '[class*="content"]'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - using unified format
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not(.source)',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    const text = cleanText(p.textContent);
                    if (text && text.length > 10 && !p.classList.contains('source')) {
                        article.contentList.push(text);
                        console.log(`段落 #${index + 1}:`, text.substring(0, 50) + '...');
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - using unified format
                const images = safeQueryAll(contentEl, ['img']);
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
            const commentData = ChinaDailyCrawler.crawlComments();
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

            console.log('=== China Daily 爬虫完成 ===');
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
            console.error('=== China Daily 爬虫失败 ===');
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
            const commentContainer = safeQuery(document, [
                '#comment',
                '[class*="comment"]',
                '[id*="comment"]'
            ]);

            if (commentContainer) {
                // Try to find comment count
                const countEl = safeQuery(commentContainer, [
                    '[class*="count"]',
                    '[class*="total"]',
                    '[class*="num"]'
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
                        '[class*="author"]'
                    ]);
                    const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                    // Content
                    const contentEl = safeQuery(item, [
                        '[class*="content"]',
                        '[class*="text"]',
                        'p'
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
                            [] // China Daily comments typically don't have nested replies
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
        return ChinaDailyCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.ChinaDailyCrawler = ChinaDailyCrawler;
}
