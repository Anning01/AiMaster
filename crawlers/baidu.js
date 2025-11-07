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
            const article = {
                title: '',
                publishTime: '',
                author: '',
                authorUrl: '',
                address: '',
                contents: [],
                images: [],
                videos: [],
                commentCount: 0,
                comments: []
            };

            // Extract title
            console.log('提取标题...');
            const titleEl = document.querySelector('.sKHSJ');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素 (.sKHSJ)');
            }

            // Extract author info
            console.log('提取作者信息...');
            const authorLinkEl = document.querySelector('a[href*="author.baidu.com"]');
            if (authorLinkEl) {
                article.authorUrl = authorLinkEl.href;
                const authorNameEl = document.querySelector('p[data-testid="author-name"], p._2gGWi');
                if (authorNameEl) {
                    article.author = authorNameEl.textContent.trim();
                    console.log('作者:', article.author, '链接:', article.authorUrl);
                } else {
                    console.warn('未找到作者名称元素');
                }
            } else {
                console.warn('未找到作者链接元素');
            }

            // Extract publish time
            const timeEl = document.querySelector('._2sjh9[data-testid="updatetime"]');
            if (timeEl) {
                article.publishTime = timeEl.textContent.trim();
                console.log('发布时间:', article.publishTime);
            }

            // Extract address
            const addressEl = document.querySelector('._2Wctx[data-testid="address"]');
            if (addressEl) {
                article.address = addressEl.textContent.trim();
                console.log('地址:', article.address);
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('._18p7x[data-testid="article"]');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs
                const paragraphs = contentEl.querySelectorAll('.dpu8C p, ._2kCxD p');
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p) => {
                    const text = p.textContent.trim();
                    if (text) {
                        article.contents.push({
                            type: 'text',
                            content: text
                        });
                    }
                });
                console.log('提取段落数量:', article.contents.length);

                // Extract images
                const images = contentEl.querySelectorAll('._3hMwG img, ._1NCGf img');
                console.log('找到图片数量:', images.length);

                images.forEach((img) => {
                    article.images.push({
                        src: img.src,
                        alt: img.alt || '',
                        width: img.width || ''
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
                console.error('未找到内容容器 (._18p7x[data-testid="article"])');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = BaiduCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== Baidu 爬虫完成 ===');
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
            console.error('=== Baidu 爬虫失败 ===');
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
            const countEl = document.querySelector('.xcp-publish-title[data-testid="xcp-publish-new-title"]');
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

            // Get comment list
            const commentItems = document.querySelectorAll('.xcp-item');
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                const comment = {
                    userId: '',
                    avatar: '',
                    nickname: '',
                    content: '',
                    time: '',
                    address: '',
                    likes: 0,
                    replyCount: 0,
                    replies: []
                };

                // Avatar
                const avatarEl = item.querySelector('.x-avatar-img');
                if (avatarEl) {
                    const bgImage = avatarEl.style.backgroundImage;
                    if (bgImage) {
                        comment.avatar = bgImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1');
                    }
                }

                // Nickname
                const nicknameEl = item.querySelector('.user-bar-uname');
                if (nicknameEl) {
                    comment.nickname = nicknameEl.textContent.trim();
                }

                // Content
                const contentEl = item.querySelector('.x-interact-rich-text');
                if (contentEl) {
                    comment.content = contentEl.textContent.trim();
                }

                // Time
                const timeEl = item.querySelector('.time');
                if (timeEl) {
                    comment.time = timeEl.textContent.trim();
                }

                // Address
                const addressEl = item.querySelector('.area');
                if (addressEl) {
                    comment.address = addressEl.textContent.trim();
                }

                // Likes
                const likeEl = item.querySelector('.like-text');
                if (likeEl) {
                    const likesText = likeEl.textContent.trim();
                    if (likesText && likesText !== '赞') {
                        comment.likes = parseInt(likesText) || 0;
                    }
                }

                console.log(`评论 #${index + 1}:`, {
                    nickname: comment.nickname,
                    content: comment.content.substring(0, 30) + '...',
                    time: comment.time,
                    address: comment.address
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
        return BaiduCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.BaiduCrawler = BaiduCrawler;
}
