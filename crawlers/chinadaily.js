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
            const titleEl = document.querySelector('h1, .Artical_Title, .article-title, .title');
            if (titleEl) {
                article.title = titleEl.textContent.trim();
                console.log('标题:', article.title);
            } else {
                console.warn('未找到标题元素');
            }

            // Extract publish time and author
            const infoEl = document.querySelector('.info, .article-info, .Artical_Info');
            if (infoEl) {
                const timeEl = infoEl.querySelector('[class*="time"], .date');
                if (timeEl) {
                    article.publishTime = timeEl.textContent.trim();
                    console.log('发布时间:', article.publishTime);
                }

                const authorEl = infoEl.querySelector('[class*="author"], [class*="source"]');
                if (authorEl) {
                    article.author = authorEl.textContent.trim();
                    console.log('作者:', article.author);
                }
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = document.querySelector('.Artical_Body_Left, #Content, article, [class*="article-content"]');
            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs
                const paragraphs = contentEl.querySelectorAll('p');
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p) => {
                    const text = p.textContent.trim();
                    if (text && text.length > 10 && !p.classList.contains('source')) {
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
                    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
                    if (src) {
                        article.images.push({
                            src: src,
                            alt: img.alt || '',
                            title: img.title || ''
                        });
                    }
                });
                console.log('提取图片数量:', article.images.length);

                // Extract videos
                const videos = contentEl.querySelectorAll('video, iframe[src*="video"]');
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
            const commentData = ChinaDailyCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.comments = commentData.list;
            console.log('评论数量:', article.commentCount);
            console.log('实际提取评论数:', article.comments.length);

            // Validate
            if (!article.title) {
                console.error('标题为空，爬取失败');
                throw new Error('Failed to extract article title');
            }

            console.log('=== China Daily 爬虫完成 ===');
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
            console.error('=== China Daily 爬虫失败 ===');
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
            const commentContainer = document.querySelector('#comment, [class*="comment"]');

            if (commentContainer) {
                // Try to find comment count
                const countEl = commentContainer.querySelector('[class*="count"], [class*="total"]');
                if (countEl) {
                    const countMatch = countEl.textContent.match(/(\d+)/);
                    if (countMatch) {
                        result.count = parseInt(countMatch[1]) || 0;
                        console.log('评论总数:', result.count);
                    }
                }

                // Try to find comment items
                const commentItems = commentContainer.querySelectorAll('[class*="item"], li');
                console.log('找到评论项数量:', commentItems.length);

                commentItems.forEach((item, index) => {
                    console.log(`处理评论 #${index + 1}...`);

                    const comment = {
                        nickname: '',
                        content: '',
                        time: '',
                        likes: 0
                    };

                    const nicknameEl = item.querySelector('[class*="name"], [class*="user"]');
                    if (nicknameEl) comment.nickname = nicknameEl.textContent.trim();

                    const contentEl = item.querySelector('[class*="content"], [class*="text"]');
                    if (contentEl) comment.content = contentEl.textContent.trim();

                    const timeEl = item.querySelector('[class*="time"]');
                    if (timeEl) comment.time = timeEl.textContent.trim();

                    console.log(`评论 #${index + 1}:`, {
                        nickname: comment.nickname,
                        content: comment.content.substring(0, 30) + '...',
                        time: comment.time
                    });

                    if (comment.nickname && comment.content) {
                        result.list.push(comment);
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

    crawl: () => {
        return ChinaDailyCrawler.crawlArticle();
    }
};

if (typeof window !== 'undefined') {
    window.ChinaDailyCrawler = ChinaDailyCrawler;
}
