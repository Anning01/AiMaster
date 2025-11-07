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
            const article = {
                title: '',
                publishTime: '',
                author: '',
                authorUrl: '',
                source: '',
                contents: [],
                images: [],
                videos: [],
                commentCount: 0,
                comments: []
            };

            // Extract title
            console.log('提取标题...');
            const titleEl = document.querySelector('.text-title h1');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract publish time
            console.log('提取元信息...');
            const timeEl = document.querySelector('#news-time, .time');
            if (timeEl) {
                article.publishTime = timeEl.textContent.trim();
                console.log('发布时间:', article.publishTime);
            } else {
                console.warn('未找到时间元素');
            }

            // Extract source (optional - some pages don't have it)
            const sourceEl = document.querySelector('[data-role="original-link"]');
            if (sourceEl) {
                article.source = sourceEl.textContent.replace('来源:', '').trim();
                console.log('来源:', article.source);
            } else {
                console.warn('未找到来源元素 (某些页面可能没有来源信息)');
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('#mp-editor, article.article');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - exclude editor name
                const paragraphs = contentEl.querySelectorAll('p:not([data-role="editor-name"])');
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    // Skip if contains "返回搜狐" link
                    if (p.querySelector('#backsohucom')) {
                        console.log(`段落 #${index + 1} 包含返回链接，跳过`);
                        return;
                    }

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

                // Extract images - only real article images
                const images = contentEl.querySelectorAll('img');
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
                    // Skip data:image, preload images, and sohu icons
                    if (src &&
                        !src.startsWith('data:image') &&
                        !src.includes('preload.png') &&
                        !src.includes('icon_') &&
                        !src.includes('logo_sohu')) {
                        article.images.push({
                            src: src,
                            alt: img.alt || '',
                            title: img.title || ''
                        });
                    }
                });
                console.log('提取图片数量:', article.images.length);

                // Extract videos (if any)
                const videos = contentEl.querySelectorAll('video, iframe[src*="video"]');
                console.log('找到视频数量:', videos.length);

                videos.forEach((video) => {
                    const src = video.src || video.getAttribute('data-src');
                    if (src) {
                        article.videos.push({
                            src: src,
                            poster: video.poster || '',
                            type: video.tagName.toLowerCase()
                        });
                    }
                });
                console.log('提取视频数量:', article.videos.length);
            } else {
                console.error('未找到内容容器');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = SohuCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== Sohu 爬虫完成 ===');
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
            console.error('=== Sohu 爬虫失败 ===');
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
            // Try to find comment count - use more specific selector
            const countEl = document.querySelector('.comment-count');
            if (countEl) {
                const countMatch = countEl.textContent.match(/(\d+)/);
                if (countMatch) {
                    result.count = parseInt(countMatch[1]) || 0;
                    console.log('评论总数:', result.count);
                }
            } else {
                console.warn('未找到评论计数元素');
            }

            // Find comment items - use specific selector for Sohu
            const commentItems = document.querySelectorAll('.comment-item[data-v-586d6cf8]');
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

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

                // Extract avatar
                const avatarEl = item.querySelector('.left img');
                if (avatarEl) {
                    comment.avatar = avatarEl.src;
                }

                // Extract nickname
                const nicknameEl = item.querySelector('.author-area.name span');
                if (nicknameEl) {
                    comment.nickname = nicknameEl.textContent.trim();
                }

                // Extract time and location
                const tagEls = item.querySelectorAll('.comment-tag .plain-tag');
                if (tagEls.length >= 1) {
                    comment.time = tagEls[0].textContent.trim();
                }
                if (tagEls.length >= 2) {
                    comment.location = tagEls[1].textContent.trim();
                }

                // Extract content
                const contentEl = item.querySelector('.comment-content-text');
                if (contentEl) {
                    comment.content = contentEl.textContent.trim();
                }

                // Extract likes
                const likeEls = item.querySelectorAll('.btn-area .text');
                if (likeEls.length > 0) {
                    const likesText = likeEls[0].textContent.trim();
                    if (likesText && likesText !== '点赞') {
                        comment.likes = parseInt(likesText) || 0;
                    }
                }

                console.log(`评论 #${index + 1}:`, {
                    nickname: comment.nickname,
                    content: comment.content.substring(0, 30) + '...',
                    location: comment.location,
                    time: comment.time,
                    likes: comment.likes
                });

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
        return SohuCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.SohuCrawler = SohuCrawler;
}
