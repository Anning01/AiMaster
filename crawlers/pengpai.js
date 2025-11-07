// Pengpai News Crawler Module
// Extract article and comments from Pengpai (The Paper) news pages

const PengpaiCrawler = {
    name: 'Pengpai News',

    // Platform detection
    match: (url) => {
        return url.includes('thepaper.cn') || url.includes('pengpai');
    },

    // Extract article content
    crawlArticle: () => {
        console.log('=== Pengpai 爬虫开始 ===');
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
            const titleEl = document.querySelector('h1.index_title__B8mhI');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract author
            console.log('提取作者信息...');
            const authorEl = document.querySelector('.index_left__LfzyH > div:first-child');
            if (authorEl) {
                article.author = authorEl.textContent.trim();
                console.log('作者:', article.author);
            }

            // Extract publish time and source
            const timeEl = document.querySelector('.ant-space-item span');
            if (timeEl) {
                article.publishTime = timeEl.textContent.trim();
                console.log('发布时间:', article.publishTime);
            }

            const sourceEl = document.querySelector('.ant-space-item:nth-child(2) span');
            if (sourceEl) {
                article.source = sourceEl.textContent.trim().replace('来源：', '');
                console.log('来源:', article.source);
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('.index_cententWrap__Jv8jK');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs
                const paragraphs = contentEl.querySelectorAll('p');
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    const text = p.textContent.trim();
                    if (text && !p.classList.contains('image_desc')) {
                        article.contents.push({
                            type: 'text',
                            content: text
                        });
                    }
                });
                console.log('提取段落数量:', article.contents.length);

                // Extract images
                const images = contentEl.querySelectorAll('img');
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    article.images.push({
                        src: img.src || img.getAttribute('data-src') || '',
                        alt: img.alt || '',
                        imageId: img.getAttribute('data-imageid') || ''
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
                console.error('未找到内容容器 (.index_cententWrap__Jv8jK)');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = PengpaiCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== Pengpai 爬虫完成 ===');
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
            console.error('=== Pengpai 爬虫失败 ===');
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
            const countEl = document.querySelector('.index_commentNumSpan__jE6dy');
            if (countEl) {
                const countText = countEl.textContent.trim();
                const countMatch = countText.match(/\((\d+)\)/);
                if (countMatch) {
                    result.count = parseInt(countMatch[1]) || 0;
                    console.log('评论总数:', result.count);
                }
            } else {
                console.warn('未找到评论计数元素');
            }

            // Get comment list
            const commentItems = document.querySelectorAll('.ant-comment.index_costomComment__b6gaa');
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
                    address: '',
                    likes: 0,
                    replyCount: 0,
                    replies: []
                };

                // User info and avatar
                const userLink = item.querySelector('a[href*="/user_"]');
                if (userLink) {
                    comment.userUrl = userLink.href;
                    const userIdMatch = userLink.href.match(/\/user_(\d+)/);
                    if (userIdMatch) {
                        comment.userId = userIdMatch[1];
                    }

                    const avatarImg = userLink.querySelector('.ant-avatar img');
                    if (avatarImg) {
                        comment.avatar = avatarImg.src;
                    }
                }

                // Nickname
                const nicknameEl = item.querySelector('.ant-comment-content-author-name a');
                if (nicknameEl) {
                    comment.nickname = nicknameEl.textContent.trim();
                }

                // Content
                const contentEl = item.querySelector('.index_content__g237N');
                if (contentEl) {
                    comment.content = contentEl.textContent.trim();
                }

                // Time and address
                const timeAddressEl = item.querySelector('.ant-space-item div');
                if (timeAddressEl) {
                    const timeAddressText = timeAddressEl.textContent.trim();
                    const parts = timeAddressText.split(' ∙ ');
                    if (parts.length > 0) {
                        comment.time = parts[0];
                    }
                    if (parts.length > 1) {
                        comment.address = parts[1];
                    }
                }

                // Likes
                const likeEl = item.querySelector('.index_num__aeCCB');
                if (likeEl) {
                    const likesText = likeEl.textContent.trim();
                    comment.likes = parseInt(likesText) || 0;
                }

                console.log(`评论 #${index + 1}:`, {
                    nickname: comment.nickname,
                    content: comment.content.substring(0, 30) + '...',
                    time: comment.time,
                    likes: comment.likes
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
        return PengpaiCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.PengpaiCrawler = PengpaiCrawler;
}
