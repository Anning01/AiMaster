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
            const article = {
                title: '',
                publishTime: '',
                author: '',
                source: '',
                contents: [],
                images: [],
                videos: [],
                commentCount: 0,
                comments: []
            };

            // Extract title
            console.log('提取标题...');
            const titleEl = document.querySelector('.content-article h1');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract author and publish time
            console.log('提取元信息...');
            const authorInfoEl = document.querySelector('#article-author');
            if (authorInfoEl) {
                // Extract author
                const authorNameEl = authorInfoEl.querySelector('.media-name');
                if (authorNameEl) {
                    article.author = authorNameEl.textContent.trim();
                    console.log('作者:', article.author);
                }

                // Extract publish time from media-meta
                const metaEl = authorInfoEl.querySelector('.media-meta');
                if (metaEl) {
                    const timeSpan = metaEl.querySelector('span:first-child');
                    if (timeSpan) {
                        article.publishTime = timeSpan.textContent.trim();
                        console.log('发布时间:', article.publishTime);
                    }
                }
            } else {
                console.warn('未找到作者信息元素');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('#article-content');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - directly find all <p> tags with text content
                const allParagraphs = contentEl.querySelectorAll('p');
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
                    const text = p.textContent.trim();

                    if (text && text.length > 10) {
                        article.contents.push({
                            type: 'text',
                            content: text
                        });
                        console.log(`段落 #${index + 1}:`, text.substring(0, 50) + '...');
                    }
                });
                console.log('提取段落数量:', article.contents.length);

                // Extract images - only article images, not UI elements
                const images = contentEl.querySelectorAll('img.qnt-img-img, img.qnr-img-lazy-load-img');
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    const src = img.getAttribute('data-src') || img.src;
                    // Skip small images and UI elements
                    if (src && !src.includes('newsapp_bt/0/') && !src.includes('loading')) {
                        article.images.push({
                            src: src,
                            alt: img.alt || '',
                            title: img.title || ''
                        });
                    }
                });
                console.log('提取图片数量:', article.images.length);

                // Extract videos - look for video tags in video player containers
                const videoContainers = contentEl.querySelectorAll('.videoPlayer');
                console.log('找到视频容器数量:', videoContainers.length);

                videoContainers.forEach((container) => {
                    const video = container.querySelector('video');
                    if (video) {
                        const posterImg = container.querySelector('img.txp_poster_img');
                        const videoId = container.id || '';

                        article.videos.push({
                            id: videoId,
                            poster: posterImg ? posterImg.src : '',
                            type: 'video'
                        });
                    }
                });
                console.log('提取视频数量:', article.videos.length);
            } else {
                console.error('未找到内容容器 (#article-content)');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = TencentCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== Tencent 爬虫完成 ===');
            console.log('最终数据摘要:', {
                title: article.title,
                author: article.author,
                paragraphs: article.contents.length,
                images: article.images.length,
                videos: article.videos.length,
                comments: article.comments.length
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

    // Extract comments
    crawlComments: () => {
        console.log('--- 开始提取评论 ---');

        const result = {
            count: 0,
            list: []
        };

        try {
            // Find comment container
            const commentContainer = document.querySelector('#qqcom-comment');

            if (commentContainer) {
                console.log('找到评论容器');

                // Try to find comment count
                const countEl = commentContainer.querySelector('.qqcom-comment-count span');
                if (countEl) {
                    const countText = countEl.textContent.trim();
                    const countMatch = countText.match(/评论\s*(\d+)/);
                    if (countMatch) {
                        result.count = parseInt(countMatch[1]) || 0;
                        console.log('评论总数:', result.count);
                    }
                } else {
                    console.warn('未找到评论计数元素');
                }

                // Get only top-level comment items (direct children of #qqcom-comment)
                const topLevelCommentItems = Array.from(commentContainer.children).filter(el =>
                    el.classList.contains('qqcom-comment-item')
                );
                console.log('找到顶级评论项数量:', topLevelCommentItems.length);

                topLevelCommentItems.forEach((commentItem, index) => {
                    console.log(`处理顶级评论 #${index + 1}...`);

                    // Extract the main comment
                    const mainCommentEl = commentItem.querySelector(':scope > .qnc-comment');
                    if (!mainCommentEl) {
                        console.warn(`评论项 #${index + 1} 没有主评论元素`);
                        return;
                    }

                    const comment = extractCommentData(mainCommentEl, index + 1);

                    if (comment.nickname && comment.content) {
                        // Extract replies (sub-comments)
                        const subCommentContainer = commentItem.querySelector('.qqcom-sub-comment');
                        if (subCommentContainer) {
                            const replyItems = subCommentContainer.querySelectorAll(':scope > .qqcom-comment-item > .qnc-comment');
                            console.log(`  评论 #${index + 1} 有 ${replyItems.length} 条回复`);

                            replyItems.forEach((replyEl, replyIndex) => {
                                const reply = extractCommentData(replyEl, `${index + 1}.${replyIndex + 1}`);
                                if (reply.nickname && reply.content) {
                                    comment.replies.push(reply);
                                }
                            });
                        }

                        result.list.push(comment);
                    } else {
                        console.warn(`评论 #${index + 1} 数据不完整，跳过`);
                    }
                });
            } else {
                console.warn('未找到评论容器 (#qqcom-comment)');
            }

            console.log('--- 评论提取完成 ---');
            console.log('成功提取评论数:', result.list.length);
            const totalReplies = result.list.reduce((sum, c) => sum + c.replies.length, 0);
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
        time: '',
        location: '',
        likes: 0,
        replyCount: 0,
        replies: []
    };

    // Avatar
    const avatarImg = commentEl.querySelector('.qnt-author-info-author-img');
    if (avatarImg) {
        comment.avatar = avatarImg.src;
    }

    // Nickname
    const nicknameEl = commentEl.querySelector('.qnc-comment__nickname');
    if (nicknameEl) {
        comment.nickname = nicknameEl.textContent.trim();
    }

    // Content
    const contentEl = commentEl.querySelector('.qnc-emoji-text-parser.qnc-comment__content');
    if (contentEl) {
        comment.content = contentEl.textContent.trim();
    }

    // Time and location
    const timeLocationEl = commentEl.querySelector('.qnc-comment__time-location');
    if (timeLocationEl) {
        const timeLocationText = timeLocationEl.querySelector('.qnc-comment__time-location-text');
        if (timeLocationText) {
            comment.location = timeLocationText.textContent.trim();
        }

        // Time is after the location
        const fullText = timeLocationEl.textContent.trim();
        const parts = fullText.split(/[•·]/);
        if (parts.length > 1) {
            comment.time = parts[parts.length - 1].trim();
        }
    }

    // Likes
    const likeEl = commentEl.querySelector('.qnc-comment__like-count');
    if (likeEl) {
        const likesText = likeEl.textContent.trim();
        comment.likes = parseInt(likesText) || 0;
    }

    // Reply count (for top-level comments)
    const replyCountEl = commentEl.querySelector('.qqcom-comment-reply-num');
    if (replyCountEl) {
        const replyText = replyCountEl.textContent.trim();
        const replyMatch = replyText.match(/(\d+)/);
        if (replyMatch) {
            comment.replyCount = parseInt(replyMatch[1]) || 0;
        }
    }

    console.log(`  评论 ${index}:`, {
        nickname: comment.nickname,
        content: comment.content.substring(0, 30) + '...',
        location: comment.location,
        time: comment.time,
        likes: comment.likes
    });

    return comment;
}

if (typeof window !== 'undefined') {
    window.TencentCrawler = TencentCrawler;
}
