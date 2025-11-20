# 统一数据格式 - 快速参考

## 📦 核心函数速查

### 创建函数
```javascript
createEmptyArticle()                                    // 创建空文章
createImage(src, alt, width, height)                   // 创建图片对象
createVideo(src, poster, duration, title)              // 创建视频对象
createComment(avatar, nickname, time, content, children) // 创建评论对象
```

### 查询函数
```javascript
safeQuery(parent, ['selector1', 'selector2'])          // 查询单个元素
safeQueryAll(parent, ['selector1', 'selector2'])       // 查询多个元素
```

### 格式化函数
```javascript
formatTime(timeStr)                                    // 时间格式化 → YYYY-MM-DD HH:MM:SS
cleanText(text)                                        // 文本清理
normalizeUrl(url, baseUrl)                            // URL规范化 → 绝对路径
parseNumber(text)                                      // 数字解析(支持中文)
```

### 提取函数
```javascript
extractImage(imgElement, baseUrl)                      // 提取图片数据
extractVideo(videoElement, baseUrl)                    // 提取视频数据
```

### 验证函数
```javascript
validateArticle(article)                               // 验证数据完整性
// 返回: {valid: boolean, errors: string[]}
```

## 📋 统一数据结构

```javascript
{
    url: '',                    // 文章URL [必填]
    title: '',                  // 标题 [必填]
    publishTime: '',            // YYYY-MM-DD HH:MM:SS [必填]

    author: {                   // 作者对象 [必填]
        avatar: '',             // 头像URL
        nickname: '',           // 昵称 [必填]
        url: ''                 // 主页URL
    },

    contentList: [],            // string[] [必填,可空]
    imageList: [],              // Image[] [必填,可空]
    videoList: [],              // Video[] [必填,可空]

    commentCount: 0,            // number [必填]
    commentList: []             // Comment[] [必填,可空]
}
```

## 🎯 标准爬虫模板

```javascript
const PlatformCrawler = {
    name: 'Platform Name',

    match: (url) => url.includes('platform.com'),

    crawlArticle: () => {
        try {
            // 1. 创建对象
            const article = createEmptyArticle();
            article.url = window.location.href;

            // 2. 提取标题
            const titleEl = safeQuery(document, ['h1.title', 'h1']);
            article.title = cleanText(titleEl?.textContent);

            // 3. 提取时间
            const timeEl = safeQuery(document, ['time', '[class*="time"]']);
            article.publishTime = formatTime(timeEl?.textContent);

            // 4. 提取作者
            const authorEl = safeQuery(document, ['[class*="author"]']);
            article.author.nickname = cleanText(authorEl?.textContent);

            // 5. 提取内容
            const paragraphs = safeQueryAll(document, ['p']);
            paragraphs.forEach(p => {
                const text = cleanText(p.textContent);
                if (text) article.contentList.push(text);
            });

            // 6. 提取图片
            const images = safeQueryAll(document, ['img']);
            images.forEach(img => {
                const imageObj = extractImage(img);
                if (imageObj?.src) article.imageList.push(imageObj);
            });

            // 7. 提取视频
            const videos = safeQueryAll(document, ['video']);
            videos.forEach(video => {
                const videoObj = extractVideo(video);
                if (videoObj?.src) article.videoList.push(videoObj);
            });

            // 8. 提取评论
            const commentData = PlatformCrawler.crawlComments();
            article.commentCount = commentData.count;
            article.commentList = commentData.list;

            // 9. 验证数据
            const validation = validateArticle(article);
            if (!validation.valid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            return article;
        } catch (error) {
            console.error('爬取失败:', error);
            throw error;
        }
    },

    crawlComments: () => {
        const result = { count: 0, list: [] };

        try {
            // 提取评论数
            const countEl = safeQuery(document, ['[class*="count"]']);
            result.count = parseNumber(countEl?.textContent);

            // 提取评论列表
            const items = safeQueryAll(document, ['.comment']);
            items.forEach(item => {
                const avatar = safeQuery(item, ['img'])?.src || '';
                const nickname = cleanText(safeQuery(item, ['[class*="name"]'])?.textContent);
                const content = cleanText(safeQuery(item, ['[class*="content"]'])?.textContent);
                const time = formatTime(safeQuery(item, ['[class*="time"]'])?.textContent);

                if (nickname && content) {
                    result.list.push(createComment(
                        normalizeUrl(avatar),
                        nickname,
                        time,
                        content,
                        []
                    ));
                }
            });
        } catch (error) {
            console.error('评论提取失败:', error);
        }

        return result;
    },

    crawl: () => PlatformCrawler.crawlArticle()
};

if (typeof window !== 'undefined') {
    window.PlatformCrawler = PlatformCrawler;
}
```

## 🔧 常用选择器组合

### 标题
```javascript
safeQuery(document, [
    '[data-testid="title"]',
    'h1.article-title',
    'h1[class*="title"]',
    'h1'
])
```

### 时间
```javascript
safeQuery(document, [
    'time',
    '[class*="time"]',
    '[class*="date"]',
    '[data-testid*="time"]'
])
```

### 作者
```javascript
safeQuery(document, [
    '[class*="author-name"]',
    '[class*="author"] [class*="name"]',
    'a[class*="author"]',
    '[data-author]'
])
```

### 内容容器
```javascript
safeQuery(document, [
    'article',
    '.article-content',
    '[class*="article"]',
    '[data-testid="article"]'
])
```

### 段落 (排除无用段落)
```javascript
safeQueryAll(contentEl, [
    'p:not([class*="copyright"]):not([class*="source"])',
    'p'
])
```

### 图片 (排除头像)
```javascript
safeQueryAll(contentEl, [
    'img:not([class*="avatar"])',
    'img'
])
```

### 视频
```javascript
safeQueryAll(contentEl, [
    'video',
    'iframe[src*="video"]',
    'iframe[src*="player"]'
])
```

### 评论项
```javascript
safeQueryAll(document, [
    '.comment-item',
    '[class*="comment-item"]',
    '[class*="comment-list"] > li'
])
```

## ⚡ 时间格式支持

| 输入格式 | 输出格式 |
|---------|---------|
| `刚刚` | `2024-11-20 16:30:00` |
| `5分钟前` | `2024-11-20 16:25:00` |
| `2小时前` | `2024-11-20 14:30:00` |
| `3天前` | `2024-11-17 16:30:00` |
| `昨天 15:30` | `2024-11-19 15:30:00` |
| `2024年11月20日 15:30` | `2024-11-20 15:30:00` |
| `2024-11-20 15:30:05` | `2024-11-20 15:30:05` |

## 🔢 数字解析支持

| 输入 | 输出 |
|------|------|
| `123` | `123` |
| `1.5万` | `15000` |
| `2千` | `2000` |
| `3百` | `300` |
| `评论 456` | `456` |

## ✅ 数据验证检查项

必填字段:
- ✅ `url` - 文章URL
- ✅ `title` - 文章标题
- ✅ `publishTime` - 发布时间
- ✅ `author.nickname` - 作者昵称
- ✅ `contentList` - 内容数组(可空)
- ✅ `imageList` - 图片数组(可空)
- ✅ `videoList` - 视频数组(可空)
- ✅ `commentCount` - 评论数量
- ✅ `commentList` - 评论数组(可空)

## 🎨 代码风格

### ✅ 推荐
```javascript
// 使用可选链
const text = titleEl?.textContent;

// 使用逻辑或提供默认值
const avatar = avatarEl?.src || '';

// 先清理再判断
const text = cleanText(p.textContent);
if (text) article.contentList.push(text);

// 使用工具函数
article.publishTime = formatTime(timeEl?.textContent);
```

### ❌ 避免
```javascript
// 不要直接使用querySelector
const el = document.querySelector('.title');

// 不要手动格式化时间
const time = timeStr.replace(/年/g, '-');

// 不要跳过验证
return article;  // 应该先validateArticle
```

## 📁 文件引用顺序

在 manifest.json 中必须按此顺序加载:
```json
[
    "crawlers/schema.js",      // 1️⃣ 数据结构定义
    "crawlers/formatter.js",   // 2️⃣ 工具函数
    "crawlers/toutiao.js",     // 3️⃣ 各平台爬虫
    "crawlers/baidu.js",
    ...
    "content.js"               // 4️⃣ 主脚本
]
```

## 📚 相关文档

- [UNIFIED_SCHEMA.md](UNIFIED_SCHEMA.md) - 完整规范文档
- [EXAMPLE_USAGE.md](EXAMPLE_USAGE.md) - 详细使用示例
- [UNIFIED_FORMAT_SUMMARY.md](../UNIFIED_FORMAT_SUMMARY.md) - 实施总结

## 💡 提示

1. 多提供几个备选选择器,提高稳定性
2. 所有文本都用 `cleanText()` 清理
3. 所有时间都用 `formatTime()` 格式化
4. 所有URL都用 `normalizeUrl()` 规范化
5. 返回前必须调用 `validateArticle()` 验证

---

**快速参考 v1.0** | 最后更新: 2024-11-20
