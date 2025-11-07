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
            const article = {
                title: '',
                publishTime: '',
                author: '',
                authorUrl: '',
                contents: [],
                images: [],
                videos: [],
                commentCount: 0,
                comments: []
            };

            // Extract title
            console.log('提取标题...');
            const titleEl = document.querySelector('.article-content h1');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素 (.article-content h1)');
            }

            // Extract publish time and author
            console.log('提取元信息...');
            const metaEl = document.querySelector('.article-meta');
            if (metaEl) {
                const timeEl = metaEl.querySelector('span:first-child');
                if (timeEl) {
                    article.publishTime = timeEl.textContent.trim();
                    console.log('发布时间:', article.publishTime);
                }

                const authorLink = metaEl.querySelector('.name a');
                if (authorLink) {
                    article.author = authorLink.textContent.trim();
                    article.authorUrl = authorLink.href;
                    console.log('作者:', article.author, '链接:', article.authorUrl);
                }
            } else {
                console.warn('未找到元信息容器 (.article-meta)');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('article.syl-article-base');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs
                const paragraphs = contentEl.querySelectorAll('p');
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    const text = p.textContent.trim();
                    if (text && !p.classList.contains('syl-page-br')) {
                        article.contents.push({
                            type: 'text',
                            content: text,
                            dataTrack: p.getAttribute('data-track') || ''
                        });
                    }
                });
                console.log('提取段落数量:', article.contents.length);

                // Extract images
                const images = contentEl.querySelectorAll('img');
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    article.images.push({
                        src: img.src,
                        alt: img.alt || '',
                        dataSrc: img.getAttribute('data-src') || ''
                    });
                });
                console.log('提取图片数量:', article.images.length);

                // Extract videos (if any)
                const videos = contentEl.querySelectorAll('video, iframe[src*="video"]');
                console.log('找到视频数量:', videos.length);

                videos.forEach((video) => {
                    article.videos.push({
                        src: video.src || video.getAttribute('data-src') || '',
                        poster: video.poster || '',
                        type: video.tagName.toLowerCase()
                    });
                });
                console.log('提取视频数量:', article.videos.length);
            } else {
                console.error('未找到内容容器 (article.syl-article-base)');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = ToutiaoCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== Toutiao 爬虫完成 ===');
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
            console.error('=== Toutiao 爬虫失败 ===');
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
            // Get comment count
            const countEl = document.querySelector('.ttp-comment-wrapper .title span');
            if (countEl) {
                result.count = parseInt(countEl.textContent.trim()) || 0;
                console.log('评论总数:', result.count);
            } else {
                console.warn('未找到评论计数元素 (.ttp-comment-wrapper .title span)');
            }

            // Get comment list
            const commentItems = document.querySelectorAll('.comment-list > li');
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                const comment = {
                    userId: '',
                    userUrl: '',
                    avatar: '',
                    nickname: '',
                    content: '',
                    time: '',
                    likes: 0,
                    replyCount: 0,
                    replies: []
                };

                // User info
                const userLink = item.querySelector('a[href*="/c/user/"]');
                if (userLink) {
                    comment.userUrl = userLink.href;
                    const userId = userLink.href.match(/\/c\/user\/(\d+)/);
                    if (userId) {
                        comment.userId = userId[1];
                    }
                }

                // Avatar
                const avatarImg = item.querySelector('.ttp-avatar img');
                if (avatarImg) {
                    comment.avatar = avatarImg.src;
                }

                // Nickname
                const nicknameEl = item.querySelector('.user-name .name');
                if (nicknameEl) {
                    comment.nickname = nicknameEl.textContent.trim();
                }

                // Content
                const contentEl = item.querySelector('.body .content');
                if (contentEl) {
                    comment.content = contentEl.textContent.trim();
                }

                // Time
                const timeEl = item.querySelector('.footer .time');
                if (timeEl) {
                    comment.time = timeEl.textContent.trim();
                }

                // Likes
                const likeEl = item.querySelector('.ttp-comment-like .inner span');
                if (likeEl) {
                    const likesText = likeEl.textContent.trim();
                    comment.likes = parseInt(likesText) || 0;
                }

                // Reply count
                const replyBtn = item.querySelector('button.check-more-reply');
                if (replyBtn) {
                    const replyText = replyBtn.textContent;
                    const replyMatch = replyText.match(/(\d+)/);
                    if (replyMatch) {
                        comment.replyCount = parseInt(replyMatch[1]);
                    }
                }

                console.log(`评论 #${index + 1}:`, {
                    nickname: comment.nickname,
                    content: comment.content.substring(0, 30) + '...',
                    likes: comment.likes,
                    replyCount: comment.replyCount
                });

                // Only add if we have basic info
                if (comment.nickname && comment.content) {
                    result.list.push(comment);
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
