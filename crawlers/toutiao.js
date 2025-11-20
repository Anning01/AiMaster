// Toutiao Crawler Module
// Extract article and comments from Toutiao article pages

const ToutiaoCrawler = {
    name: 'Toutiao',

    // Platform detection
    match: (url) => {
        return url.includes('toutiao.com') || url.includes('www.toutiao.com');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== Toutiao 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                'article h1',
                '.article-content h1',
                'h1.title',
                'h1'
            ]);
            if (titleEl) {
                article.title = cleanText(titleEl.textContent);
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract publish time and author
            console.log('提取元信息...');
            const metaEl = safeQuery(document, [
                '.article-meta',
                '.article-info',
                '[class*="meta"]'
            ]);

            if (metaEl) {
                // Extract time
                const timeEl = safeQuery(metaEl, [
                    'span[class*="time"]',
                    'time',
                    'span:first-child',
                    '[class*="date"]'
                ]);
                if (timeEl) {
                    article.publishTime = formatTime(timeEl.textContent.trim());
                    console.log('发布时间:', article.publishTime);
                }

                // Extract author
                const authorLink = safeQuery(metaEl, [
                    'a[class*="name"]',
                    '.name a',
                    'a[class*="author"]'
                ]);
                if (authorLink) {
                    article.author.nickname = cleanText(authorLink.textContent);
                    article.author.url = normalizeUrl(authorLink.href);
                    console.log('作者:', article.author.nickname, '链接:', article.author.url);
                }

                // Extract author avatar
                const avatarImg = safeQuery(metaEl, [
                    'img[class*="avatar"]',
                    '.avatar img',
                    'img'
                ]);
                if (avatarImg) {
                    article.author.avatar = normalizeUrl(avatarImg.src);
                }
            } else {
                console.warn('未找到元信息容器');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                'article.syl-article-base',
                'article[class*="article"]',
                '.article-content',
                'article'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - using unified format
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not([class*="page-br"]):not([class*="copyright"])',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p) => {
                    const text = cleanText(p.textContent);
                    // Only add non-empty paragraphs
                    if (text && text.length > 0) {
                        article.contentList.push(text);
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - using unified format
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
                    'iframe[src*="player"]',
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
            const commentData = ToutiaoCrawler.crawlComments();
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

            console.log('=== Toutiao 爬虫完成 ===');
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
            console.error('=== Toutiao 爬虫失败 ===');
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
                '[class*="comment"] [class*="title"] span',
                '.ttp-comment-wrapper .title span',
                '[class*="comment-count"]'
            ]);
            if (countEl) {
                result.count = parseNumber(countEl.textContent) || 0;
                console.log('评论总数:', result.count);
            } else {
                console.warn('未找到评论计数元素');
            }

            // Get comment list - using stable selectors
            const commentItems = safeQueryAll(document, [
                '.comment-list > li',
                '[class*="comment-list"] > li',
                '[class*="comment-item"]'
            ]);
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                // Avatar - using unified schema
                const avatarImg = safeQuery(item, [
                    'img[class*="avatar"]',
                    '.ttp-avatar img',
                    '.user-avatar img',
                    'img'
                ]);
                const avatar = avatarImg ? normalizeUrl(avatarImg.src) : '';

                // Nickname
                const nicknameEl = safeQuery(item, [
                    '[class*="user-name"] [class*="name"]',
                    '.user-name .name',
                    '[class*="nickname"]',
                    'a[class*="name"]'
                ]);
                const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                // Content
                const contentEl = safeQuery(item, [
                    '[class*="body"] [class*="content"]',
                    '.body .content',
                    '.comment-content',
                    '[class*="comment-text"]'
                ]);
                const content = contentEl ? cleanText(contentEl.textContent) : '';

                // Time
                const timeEl = safeQuery(item, [
                    '[class*="footer"] [class*="time"]',
                    '.footer .time',
                    'time',
                    '[class*="time"]'
                ]);
                const publishTime = timeEl ? formatTime(timeEl.textContent) : '';

                // Extract replies/children if exist
                const children = [];
                const replyItems = safeQueryAll(item, [
                    '[class*="reply-list"] > li',
                    '.reply-list > li',
                    '[class*="sub-comment"]'
                ]);

                replyItems.forEach((replyItem) => {
                    const replyAvatar = safeQuery(replyItem, ['img[class*="avatar"]', 'img']);
                    const replyNickname = safeQuery(replyItem, ['[class*="name"]']);
                    const replyContent = safeQuery(replyItem, ['[class*="content"]']);
                    const replyTime = safeQuery(replyItem, ['[class*="time"]', 'time']);

                    if (replyNickname && replyContent) {
                        children.push(createComment(
                            replyAvatar ? normalizeUrl(replyAvatar.src) : '',
                            cleanText(replyNickname.textContent),
                            replyTime ? formatTime(replyTime.textContent) : '',
                            cleanText(replyContent.textContent),
                            [] // No nested replies beyond this level
                        ));
                    }
                });

                console.log(`评论 #${index + 1}:`, {
                    nickname: nickname,
                    content: content.substring(0, 30) + '...',
                    children: children.length
                });

                // Only add if we have basic info - using unified schema
                if (nickname && content) {
                    result.list.push(createComment(
                        avatar,
                        nickname,
                        publishTime,
                        content,
                        children
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
        return ToutiaoCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.ToutiaoCrawler = ToutiaoCrawler;
}
