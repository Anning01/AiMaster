// Tencent News Crawler Module
// Extract article and comments from Tencent news pages

const TencentCrawler = {
    name: 'Tencent News',

    // Platform detection
    match: (url) => {
        return url.includes('qq.com/') && (url.includes('/omn/') || url.includes('/rain/'));
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== Tencent 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                '.content-article h1',
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

            // Extract author and publish time
            console.log('提取元信息...');
            const authorInfoEl = safeQuery(document, [
                '#article-author',
                '[class*="author-info"]',
                '[class*="article-info"]'
            ]);

            if (authorInfoEl) {
                // Extract author
                const authorNameEl = safeQuery(authorInfoEl, [
                    '.media-name',
                    '[class*="media-name"]',
                    '[class*="author-name"]'
                ]);
                if (authorNameEl) {
                    article.author.nickname = cleanText(authorNameEl.textContent);
                    console.log('作者:', article.author.nickname);
                }

                // Extract author avatar
                const avatarImg = safeQuery(authorInfoEl, [
                    'img[class*="avatar"]',
                    '.avatar img',
                    'img'
                ]);
                if (avatarImg) {
                    article.author.avatar = normalizeUrl(avatarImg.src);
                }

                // Extract publish time from media-meta
                const metaEl = safeQuery(authorInfoEl, [
                    '.media-meta',
                    '[class*="meta"]'
                ]);
                if (metaEl) {
                    const timeSpan = safeQuery(metaEl, [
                        'span:first-child',
                        'span',
                        '[class*="time"]'
                    ]);
                    if (timeSpan) {
                        article.publishTime = formatTime(timeSpan.textContent);
                        console.log('发布时间:', article.publishTime);
                    }
                }
            } else {
                console.warn('未找到作者信息元素');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                '#article-content',
                '[class*="article-content"]',
                '.content-article',
                'article'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - directly find all <p> tags with text content
                const allParagraphs = safeQueryAll(contentEl, ['p']);
                console.log('找到p标签数量:', allParagraphs.length);

                allParagraphs.forEach((p, index) => {
                    // Skip if this paragraph is inside a video player
                    if (p.closest('.videoPlayer') || p.closest('.txp_controls')) {
                        console.log(`段落 #${index + 1} 在视频播放器内，跳过`);
                        return;
                    }

                    // Skip if this paragraph only contains an image
                    const hasOnlyImage = p.querySelector('img') && p.textContent.trim().length < 10;
                    if (hasOnlyImage) {
                        console.log(`段落 #${index + 1} 只有图片，跳过`);
                        return;
                    }

                    // Get text content
                    const text = cleanText(p.textContent);

                    if (text && text.length > 10) {
                        article.contentList.push(text);
                        console.log(`段落 #${index + 1}:`, text.substring(0, 50) + '...');
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - only article images, not UI elements
                const images = safeQueryAll(contentEl, [
                    'img.qnt-img-img',
                    'img.qnr-img-lazy-load-img',
                    'img:not([class*="loading"])'
                ]);
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    const src = img.getAttribute('data-src') || img.src;
                    // Skip small images and UI elements
                    if (src && !src.includes('newsapp_bt/0/') && !src.includes('loading')) {
                        const imageObj = extractImage(img);
                        if (imageObj && imageObj.src) {
                            article.imageList.push(imageObj);
                        }
                    }
                });
                console.log('提取图片数量:', article.imageList.length);

                // Extract videos - look for video tags in video player containers
                const videoContainers = safeQueryAll(contentEl, [
                    '.videoPlayer',
                    '[class*="video-player"]',
                    '[class*="video"]'
                ]);
                console.log('找到视频容器数量:', videoContainers.length);

                videoContainers.forEach((container) => {
                    const video = safeQuery(container, ['video', 'iframe']);
                    if (video) {
                        const videoObj = extractVideo(video);
                        if (videoObj && videoObj.src) {
                            // Try to get poster from container
                            const posterImg = safeQuery(container, [
                                'img.txp_poster_img',
                                'img[class*="poster"]',
                                'img'
                            ]);
                            if (posterImg && posterImg.src) {
                                videoObj.poster = normalizeUrl(posterImg.src);
                            }
                            article.videoList.push(videoObj);
                        }
                    }
                });
                console.log('提取视频数量:', article.videoList.length);
            } else {
                console.error('未找到内容容器 (#article-content)');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = TencentCrawler.crawlComments();
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

            console.log('=== Tencent 爬虫完成 ===');
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
            console.error('=== Tencent 爬虫失败 ===');
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
            // Find comment container
            const commentContainer = safeQuery(document, [
                '#qqcom-comment',
                '[class*="qqcom-comment"]',
                '[class*="comment"]'
            ]);

            if (commentContainer) {
                console.log('找到评论容器');

                // Try to find comment count
                const countEl = safeQuery(commentContainer, [
                    '.qqcom-comment-count span',
                    '[class*="comment-count"] span',
                    '[class*="count"]'
                ]);
                if (countEl) {
                    result.count = parseNumber(countEl.textContent);
                    console.log('评论总数:', result.count);
                } else {
                    console.warn('未找到评论计数元素');
                }

                // Get only top-level comment items (direct children)
                const topLevelCommentItems = Array.from(commentContainer.children).filter(el =>
                    el.classList.contains('qqcom-comment-item') ||
                    el.className.includes('comment-item')
                );
                console.log('找到顶级评论项数量:', topLevelCommentItems.length);

                topLevelCommentItems.forEach((commentItem, index) => {
                    console.log(`处理顶级评论 #${index + 1}...`);

                    // Extract the main comment
                    const mainCommentEl = safeQuery(commentItem, [
                        ':scope > .qnc-comment',
                        '.qnc-comment',
                        '[class*="comment"]'
                    ]);
                    if (!mainCommentEl) {
                        console.warn(`评论项 #${index + 1} 没有主评论元素`);
                        return;
                    }

                    const comment = extractCommentData(mainCommentEl, index + 1);

                    if (comment.nickname && comment.content) {
                        // Extract replies (sub-comments)
                        const children = [];
                        const subCommentContainer = safeQuery(commentItem, [
                            '.qqcom-sub-comment',
                            '[class*="sub-comment"]'
                        ]);
                        if (subCommentContainer) {
                            const replyItems = safeQueryAll(subCommentContainer, [
                                ':scope > .qqcom-comment-item > .qnc-comment',
                                '.qnc-comment',
                                '[class*="comment"]'
                            ]);
                            console.log(`  评论 #${index + 1} 有 ${replyItems.length} 条回复`);

                            replyItems.forEach((replyEl, replyIndex) => {
                                const reply = extractCommentData(replyEl, `${index + 1}.${replyIndex + 1}`);
                                if (reply.nickname && reply.content) {
                                    children.push(createComment(
                                        reply.avatar,
                                        reply.nickname,
                                        reply.publishTime,
                                        reply.content,
                                        [] // No nested replies beyond this level
                                    ));
                                }
                            });
                        }

                        result.list.push(createComment(
                            comment.avatar,
                            comment.nickname,
                            comment.publishTime,
                            comment.content,
                            children
                        ));
                    } else {
                        console.warn(`评论 #${index + 1} 数据不完整，跳过`);
                    }
                });
            } else {
                console.warn('未找到评论容器 (#qqcom-comment)');
            }

            console.log('--- 评论提取完成 ---');
            console.log('成功提取评论数:', result.list.length);
            const totalReplies = result.list.reduce((sum, c) => sum + c.children.length, 0);
            console.log('成功提取回复数:', totalReplies);

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
        return TencentCrawler.crawlArticle();
    }
};

// Helper function to extract comment data
function extractCommentData(commentEl, index) {
    const comment = {
        avatar: '',
        nickname: '',
        content: '',
        publishTime: ''
    };

    // Avatar
    const avatarImg = safeQuery(commentEl, [
        '.qnt-author-info-author-img',
        'img[class*="avatar"]',
        '.avatar img',
        'img'
    ]);
    if (avatarImg) {
        comment.avatar = normalizeUrl(avatarImg.src);
    }

    // Nickname
    const nicknameEl = safeQuery(commentEl, [
        '.qnc-comment__nickname',
        '[class*="nickname"]',
        '[class*="name"]'
    ]);
    if (nicknameEl) {
        comment.nickname = cleanText(nicknameEl.textContent);
    }

    // Content
    const contentEl = safeQuery(commentEl, [
        '.qnc-emoji-text-parser.qnc-comment__content',
        '.qnc-comment__content',
        '[class*="content"]'
    ]);
    if (contentEl) {
        comment.content = cleanText(contentEl.textContent);
    }

    // Time and location
    const timeLocationEl = safeQuery(commentEl, [
        '.qnc-comment__time-location',
        '[class*="time-location"]',
        '[class*="time"]'
    ]);
    if (timeLocationEl) {
        // Time is usually after the location, separated by • or ·
        const fullText = timeLocationEl.textContent.trim();
        const parts = fullText.split(/[•·]/);
        if (parts.length > 1) {
            comment.publishTime = formatTime(parts[parts.length - 1].trim());
        } else {
            comment.publishTime = formatTime(fullText);
        }
    }

    console.log(`  评论 ${index}:`, {
        nickname: comment.nickname,
        content: comment.content.substring(0, 30) + '...',
        time: comment.publishTime
    });

    return comment;
}

// Export for use in content script
if (typeof window !== 'undefined') {
    window.TencentCrawler = TencentCrawler;
}
