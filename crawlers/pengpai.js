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
            // Create article using unified schema
            const article = createEmptyArticle();
            article.url = window.location.href;

            // Extract title - using stable elements
            console.log('提取标题...');
            const titleEl = safeQuery(document, [
                'h1.index_title__B8mhI',
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

            // Extract author
            console.log('提取作者信息...');
            const authorEl = safeQuery(document, [
                '.index_left__LfzyH > div:first-child',
                '[class*="author"]',
                '[class*="left"] > div:first-child'
            ]);
            if (authorEl) {
                article.author.nickname = cleanText(authorEl.textContent);
                console.log('作者:', article.author.nickname);
            }

            // Extract publish time and source
            console.log('提取元信息...');
            const timeEl = safeQuery(document, [
                '.ant-space-item span',
                '[class*="space-item"] span',
                '[class*="time"]',
                'time'
            ]);
            if (timeEl) {
                article.publishTime = formatTime(timeEl.textContent);
                console.log('发布时间:', article.publishTime);
            }

            const sourceEl = safeQuery(document, [
                '.ant-space-item:nth-child(2) span',
                '[class*="source"]'
            ]);
            if (sourceEl) {
                const sourceName = cleanText(sourceEl.textContent.replace('来源：', ''));
                console.log('来源:', sourceName);
            }

            // Extract article content
            console.log('提取文章内容...');
            const contentEl = safeQuery(document, [
                '.index_cententWrap__Jv8jK',
                '[class*="contentWrap"]',
                '[class*="content"]',
                'article'
            ]);

            if (contentEl) {
                console.log('找到内容容器');

                // Extract paragraphs - using unified format
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not(.image_desc)',
                    'p'
                ]);
                console.log('找到段落数量:', paragraphs.length);

                paragraphs.forEach((p, index) => {
                    const text = cleanText(p.textContent);
                    if (text && !p.classList.contains('image_desc') && text.length > 0) {
                        article.contentList.push(text);
                        console.log(`段落 #${index + 1}:`, text.substring(0, 50) + '...');
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // Extract images - using unified format
                const images = safeQueryAll(contentEl, [
                    'img',
                    'img[data-imageid]'
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
                console.error('未找到内容容器 (.index_cententWrap__Jv8jK)');
            }

            // Extract comments
            console.log('提取评论数据...');
            const commentData = PengpaiCrawler.crawlComments();
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

            console.log('=== Pengpai 爬虫完成 ===');
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
            console.error('=== Pengpai 爬虫失败 ===');
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
            // Get comment count
            const countEl = safeQuery(document, [
                '.index_commentNumSpan__jE6dy',
                '[class*="commentNumSpan"]',
                '[class*="comment-count"]'
            ]);
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
            const commentItems = safeQueryAll(document, [
                '.ant-comment.index_costomComment__b6gaa',
                '.ant-comment',
                '[class*="comment"]'
            ]);
            console.log('找到评论项数量:', commentItems.length);

            commentItems.forEach((item, index) => {
                console.log(`处理评论 #${index + 1}...`);

                // User info and avatar
                let avatar = '';
                let userUrl = '';
                const userLink = safeQuery(item, [
                    'a[href*="/user_"]',
                    '[class*="avatar"] a',
                    'a'
                ]);
                if (userLink) {
                    userUrl = normalizeUrl(userLink.href);

                    const avatarImg = safeQuery(userLink, [
                        '.ant-avatar img',
                        'img[class*="avatar"]',
                        'img'
                    ]);
                    if (avatarImg) {
                        avatar = normalizeUrl(avatarImg.src);
                    }
                }

                // Nickname
                const nicknameEl = safeQuery(item, [
                    '.ant-comment-content-author-name a',
                    '[class*="author-name"] a',
                    '[class*="nickname"]'
                ]);
                const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                // Content
                const contentEl = safeQuery(item, [
                    '.index_content__g237N',
                    '[class*="content"]',
                    '.ant-comment-content-detail'
                ]);
                const content = contentEl ? cleanText(contentEl.textContent) : '';

                // Time and address
                let publishTime = '';
                const timeAddressEl = safeQuery(item, [
                    '.ant-space-item div',
                    '[class*="space-item"] div',
                    '[class*="time"]'
                ]);
                if (timeAddressEl) {
                    const timeAddressText = timeAddressEl.textContent.trim();
                    const parts = timeAddressText.split(' ∙ ');
                    if (parts.length > 0) {
                        publishTime = formatTime(parts[0]);
                    }
                }

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
                        [] // Pengpai comments typically don't have nested replies
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
        return PengpaiCrawler.crawlArticle();
    }
};

// Export for use in content script
if (typeof window !== 'undefined') {
    window.PengpaiCrawler = PengpaiCrawler;
}
