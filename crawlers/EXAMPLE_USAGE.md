# 统一数据格式使用示例

## 概述
本文档提供了使用统一数据格式的实际示例代码。

## 完整示例:创建一个新的爬虫

```javascript
// NewPlatformCrawler.js - 新平台爬虫示例

const NewPlatformCrawler = {
    name: 'New Platform',

    // 平台检测
    match: (url) => {
        return url.includes('newplatform.com');
    },

    // 提取文章内容
    crawlArticle: () => {
        console.log('=== NewPlatform 爬虫开始 ===');
        console.log('当前页面 URL:', window.location.href);

        try {
            // 步骤1: 创建文章对象
            const article = createEmptyArticle();
            article.url = window.location.href;

            // 步骤2: 提取标题
            // 使用safeQuery提供多个备选选择器
            const titleEl = safeQuery(document, [
                '[data-testid="article-title"]',  // 最稳定
                'h1.article-title',               // 次选
                'h1[class*="title"]',             // 备选
                'h1'                              // 兜底
            ]);
            if (titleEl) {
                article.title = cleanText(titleEl.textContent);
                console.log('标题:', article.title);
            }

            // 步骤3: 提取作者信息
            const authorEl = safeQuery(document, [
                '[class*="author-info"]',
                '.author',
                '[data-author]'
            ]);
            if (authorEl) {
                // 提取昵称
                const nameEl = safeQuery(authorEl, [
                    '[class*="name"]',
                    'a',
                    'span'
                ]);
                if (nameEl) {
                    article.author.nickname = cleanText(nameEl.textContent);
                }

                // 提取链接
                const linkEl = safeQuery(authorEl, ['a[href]']);
                if (linkEl) {
                    article.author.url = normalizeUrl(linkEl.href);
                }

                // 提取头像
                const avatarImg = safeQuery(authorEl, [
                    'img[class*="avatar"]',
                    'img'
                ]);
                if (avatarImg) {
                    article.author.avatar = normalizeUrl(avatarImg.src);
                }
            }

            // 步骤4: 提取发布时间
            const timeEl = safeQuery(document, [
                'time',
                '[class*="time"]',
                '[class*="date"]'
            ]);
            if (timeEl) {
                // formatTime会自动处理各种时间格式
                article.publishTime = formatTime(timeEl.textContent);
                console.log('发布时间:', article.publishTime);
            }

            // 步骤5: 提取文章内容
            const contentEl = safeQuery(document, [
                'article',
                '.article-content',
                '[class*="article"]'
            ]);

            if (contentEl) {
                // 提取段落
                const paragraphs = safeQueryAll(contentEl, [
                    'p:not([class*="copyright"])',  // 排除版权段落
                    'p'
                ]);

                paragraphs.forEach((p) => {
                    const text = cleanText(p.textContent);
                    if (text && text.length > 0) {
                        article.contentList.push(text);
                    }
                });
                console.log('提取段落数量:', article.contentList.length);

                // 提取图片
                const images = safeQueryAll(contentEl, [
                    'img:not([class*="avatar"])',  // 排除头像
                    'img'
                ]);

                images.forEach((img) => {
                    const imageObj = extractImage(img);
                    if (imageObj && imageObj.src) {
                        article.imageList.push(imageObj);
                    }
                });
                console.log('提取图片数量:', article.imageList.length);

                // 提取视频
                const videos = safeQueryAll(contentEl, [
                    'video',
                    'iframe[src*="video"]',
                    'iframe[src*="player"]'
                ]);

                videos.forEach((video) => {
                    const videoObj = extractVideo(video);
                    if (videoObj && videoObj.src) {
                        article.videoList.push(videoObj);
                    }
                });
                console.log('提取视频数量:', article.videoList.length);
            }

            // 步骤6: 提取评论
            const commentData = NewPlatformCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.commentList = commentData.list;

            // 步骤7: 验证数据
            const validation = validateArticle(article);
            if (!validation.valid) {
                console.error('数据验证失败:', validation.errors);
                throw new Error('Article data validation failed: ' + validation.errors.join(', '));
            }

            console.log('=== NewPlatform 爬虫完成 ===');
            return article;

        } catch (error) {
            console.error('=== NewPlatform 爬虫失败 ===');
            console.error('错误:', error);
            throw error;
        }
    },

    // 提取评论
    crawlComments: () => {
        console.log('--- 开始提取评论 ---');

        const result = {
            count: 0,
            list: []
        };

        try {
            // 提取评论总数
            const countEl = safeQuery(document, [
                '[class*="comment-count"]',
                '.comment-total'
            ]);
            if (countEl) {
                result.count = parseNumber(countEl.textContent);
            }

            // 提取评论列表
            const commentItems = safeQueryAll(document, [
                '.comment-item',
                '[class*="comment-item"]'
            ]);

            commentItems.forEach((item, index) => {
                // 提取头像
                const avatarImg = safeQuery(item, [
                    'img[class*="avatar"]',
                    'img'
                ]);
                const avatar = avatarImg ? normalizeUrl(avatarImg.src) : '';

                // 提取昵称
                const nicknameEl = safeQuery(item, [
                    '[class*="nickname"]',
                    '[class*="name"]'
                ]);
                const nickname = nicknameEl ? cleanText(nicknameEl.textContent) : '';

                // 提取内容
                const contentEl = safeQuery(item, [
                    '[class*="comment-content"]',
                    '[class*="content"]'
                ]);
                const content = contentEl ? cleanText(contentEl.textContent) : '';

                // 提取时间
                const timeEl = safeQuery(item, [
                    'time',
                    '[class*="time"]'
                ]);
                const publishTime = timeEl ? formatTime(timeEl.textContent) : '';

                // 提取子评论(如果有)
                const children = [];
                const replyItems = safeQueryAll(item, [
                    '.reply-item',
                    '[class*="reply"]'
                ]);

                replyItems.forEach((replyItem) => {
                    const replyAvatar = safeQuery(replyItem, ['img'])?.src || '';
                    const replyNickname = cleanText(safeQuery(replyItem, ['[class*="name"]'])?.textContent || '');
                    const replyContent = cleanText(safeQuery(replyItem, ['[class*="content"]'])?.textContent || '');
                    const replyTime = formatTime(safeQuery(replyItem, ['[class*="time"]'])?.textContent || '');

                    if (replyNickname && replyContent) {
                        children.push(createComment(
                            normalizeUrl(replyAvatar),
                            replyNickname,
                            replyTime,
                            replyContent,
                            [] // 不支持更深层嵌套
                        ));
                    }
                });

                // 创建评论对象
                if (nickname && content) {
                    result.list.push(createComment(
                        avatar,
                        nickname,
                        publishTime,
                        content,
                        children
                    ));
                }
            });

            console.log('--- 评论提取完成 ---');
            console.log('成功提取评论数:', result.list.length);

        } catch (error) {
            console.error('提取评论失败:', error);
        }

        return result;
    },

    // 主入口
    crawl: () => {
        return NewPlatformCrawler.crawlArticle();
    }
};

// 导出到window
if (typeof window !== 'undefined') {
    window.NewPlatformCrawler = NewPlatformCrawler;
}
```

## 常见场景示例

### 1. 处理多种页面格式
```javascript
// 情况1: 尝试第一种格式
let contentEl = safeQuery(document, ['.format1-content']);

// 情况2: 如果没找到,尝试第二种格式
if (!contentEl) {
    contentEl = safeQuery(document, ['.format2-content']);
}

// 或者直接在safeQuery中提供所有可能的选择器
const contentEl = safeQuery(document, [
    '.format1-content',  // 格式1
    '.format2-content',  // 格式2
    '.article-content'   // 通用备选
]);
```

### 2. 处理背景图片作为头像
```javascript
const avatarEl = safeQuery(item, ['.avatar']);
let avatar = '';

if (avatarEl) {
    if (avatarEl.tagName === 'IMG') {
        // 普通img标签
        avatar = normalizeUrl(avatarEl.src);
    } else {
        // 背景图片
        const bgImage = avatarEl.style.backgroundImage;
        if (bgImage) {
            avatar = normalizeUrl(bgImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1'));
        }
    }
}
```

### 3. 处理相对时间
```javascript
// formatTime自动处理以下格式:
formatTime('刚刚')           // 返回当前时间
formatTime('5分钟前')        // 返回5分钟前的时间
formatTime('2小时前')        // 返回2小时前的时间
formatTime('3天前')          // 返回3天前的时间
formatTime('昨天 15:30')     // 返回昨天15:30的时间
formatTime('2024-11-20 15:30:05')  // 返回标准格式
```

### 4. 过滤特定元素
```javascript
// 过滤掉特定class的段落
const paragraphs = safeQueryAll(contentEl, [
    'p:not([class*="copyright"]):not([class*="source"])',
    'p'
]);

// 过滤掉头像图片
const images = safeQueryAll(contentEl, [
    'img:not([class*="avatar"])'
]);
```

### 5. 解析数字(支持中文)
```javascript
parseNumber('123')      // 返回 123
parseNumber('1.5万')    // 返回 15000
parseNumber('2千')      // 返回 2000
parseNumber('评论 456') // 返回 456
```

## 数据输出示例

```javascript
{
    "url": "https://example.com/article/123",
    "title": "这是文章标题",
    "publishTime": "2024-11-20 15:30:00",
    "author": {
        "avatar": "https://example.com/avatar.jpg",
        "nickname": "作者昵称",
        "url": "https://example.com/user/123"
    },
    "contentList": [
        "这是第一段内容。",
        "这是第二段内容。",
        "这是第三段内容。"
    ],
    "imageList": [
        {
            "src": "https://example.com/image1.jpg",
            "alt": "图片描述",
            "width": 800,
            "height": 600
        }
    ],
    "videoList": [
        {
            "src": "https://example.com/video.mp4",
            "poster": "https://example.com/poster.jpg",
            "duration": 120,
            "title": "视频标题"
        }
    ],
    "commentCount": 100,
    "commentList": [
        {
            "avatar": "https://example.com/user1.jpg",
            "nickname": "评论者1",
            "publishTime": "2024-11-20 16:00:00",
            "content": "这是一条评论",
            "children": [
                {
                    "avatar": "https://example.com/user2.jpg",
                    "nickname": "评论者2",
                    "publishTime": "2024-11-20 16:05:00",
                    "content": "这是回复",
                    "children": []
                }
            ]
        }
    ]
}
```

## 调试技巧

### 1. 查看选择器是否有效
```javascript
// 测试选择器
const testEl = safeQuery(document, ['.test-selector']);
console.log('找到元素:', testEl);
```

### 2. 查看提取的数据
```javascript
// 在返回前打印数据
console.log('最终数据:', JSON.stringify(article, null, 2));
```

### 3. 验证数据完整性
```javascript
const validation = validateArticle(article);
console.log('验证结果:', validation);
if (!validation.valid) {
    console.error('缺失字段:', validation.errors);
}
```

## 最佳实践

1. ✅ **总是使用safeQuery** - 避免直接使用querySelector
2. ✅ **提供多个备选选择器** - 提高爬虫稳定性
3. ✅ **使用工具函数** - cleanText, formatTime, normalizeUrl等
4. ✅ **验证数据** - 返回前调用validateArticle
5. ✅ **详细日志** - 记录每个步骤的执行情况
6. ✅ **错误处理** - 使用try-catch包裹主逻辑
7. ✅ **过滤无效数据** - 检查文本是否为空再添加

## 注意事项

1. ⚠️ 不要在contentList中包含HTML标签
2. ⚠️ URL必须是绝对路径,使用normalizeUrl转换
3. ⚠️ 时间格式必须统一为 YYYY-MM-DD HH:MM:SS
4. ⚠️ 评论的children不要超过2层嵌套
5. ⚠️ 图片列表不要包含头像图片
