# 统一新闻数据格式规范

## 概述
本规范定义了所有新闻平台爬虫必须遵循的统一数据格式,确保数据的一致性和可维护性。

## 核心文件

### 1. schema.js
定义标准数据结构和创建函数:
- `createEmptyArticle()` - 创建空文章对象
- `createImage()` - 创建图片对象
- `createVideo()` - 创建视频对象
- `createComment()` - 创建评论对象
- `validateArticle()` - 验证文章数据

### 2. formatter.js
提供数据格式化和规范化工具:
- `formatTime()` - 统一时间格式 (YYYY-MM-DD HH:MM:SS)
- `normalizeUrl()` - URL规范化
- `cleanText()` - 文本清理
- `extractImage()` - 图片数据提取
- `extractVideo()` - 视频数据提取
- `safeQuery()` - 安全元素查询(支持多选择器)
- `safeQueryAll()` - 安全元素批量查询
- `parseNumber()` - 数字解析

## 统一数据结构

### 文章对象 (Article)
```javascript
{
    url: '',                    // 文章URL
    title: '',                  // 文章标题
    publishTime: '',            // 发布时间 (YYYY-MM-DD HH:MM:SS)

    author: {                   // 作者信息
        avatar: '',             // 头像URL
        nickname: '',           // 昵称
        url: ''                 // 作者主页URL
    },

    contentList: [],            // 内容段落数组 (string[])
    imageList: [],              // 图片对象数组
    videoList: [],              // 视频对象数组

    commentCount: 0,            // 评论总数
    commentList: []             // 评论对象数组 (支持树形结构)
}
```

### 图片对象 (Image)
```javascript
{
    src: '',                    // 图片URL
    alt: '',                    // 替代文本
    width: 0,                   // 宽度
    height: 0                   // 高度
}
```

### 视频对象 (Video)
```javascript
{
    src: '',                    // 视频URL
    poster: '',                 // 海报/缩略图URL
    duration: 0,                // 时长(秒)
    title: ''                   // 视频标题
}
```

### 评论对象 (Comment)
```javascript
{
    avatar: '',                 // 评论者头像URL
    nickname: '',               // 评论者昵称
    publishTime: '',            // 发布时间 (YYYY-MM-DD HH:MM:SS)
    content: '',                // 评论内容
    children: []                // 子评论数组 (树形结构)
}
```

## 爬虫实现规范

### 1. 使用稳定选择器
优先使用以下顺序的选择器:
1. data属性 (如 `[data-testid="article"]`)
2. 语义化标签 (如 `article`, `time`)
3. 稳定的class (如 `.article-content`)
4. 通配符class (如 `[class*="title"]`)
5. 标签名 (如 `h1`, `p`)

### 2. 使用safeQuery函数
```javascript
const titleEl = safeQuery(document, [
    '[data-testid="title"]',    // 最稳定
    'h1.article-title',         // 次选
    'h1[class*="title"]',       // 备选
    'h1'                        // 兜底
]);
```

### 3. 多格式支持
对于有多种页面渲染格式的平台(如souhu和souhu2):
```javascript
// 方式1: 尝试选择器1
let contentEl = safeQuery(document, ['.format1']);
// 方式2: 如果拿不到,尝试选择器2
if (!contentEl) {
    contentEl = safeQuery(document, ['.format2']);
}
```

### 4. 时间格式化
所有时间必须通过 `formatTime()` 函数处理:
```javascript
article.publishTime = formatTime(timeEl.textContent);
```

支持的输入格式:
- 相对时间: "刚刚", "5分钟前", "2小时前", "3天前"
- 中文格式: "2024年11月20日 15:30"
- ISO格式: "2024-11-20 15:30:05"
- 其他常见格式

### 5. 数据验证
所有爬虫必须在返回前验证数据:
```javascript
const validation = validateArticle(article);
if (!validation.valid) {
    console.error('数据验证失败:', validation.errors);
    throw new Error('Article data validation failed');
}
```

## 必须字段
以下字段为必填项,缺失将导致验证失败:
- `url` - 文章URL
- `title` - 文章标题
- `publishTime` - 发布时间
- `author.nickname` - 作者昵称
- `contentList` - 内容数组 (可为空数组)
- `imageList` - 图片数组 (可为空数组)
- `videoList` - 视频数组 (可为空数组)
- `commentCount` - 评论数量
- `commentList` - 评论数组 (可为空数组)

## 可选字段
- `author.avatar` - 作者头像
- `author.url` - 作者主页
- 图片/视频的额外属性

## 注意事项
1. **不要包含HTML标签** - 所有文本内容必须是纯文本
2. **URL必须是绝对路径** - 使用 `normalizeUrl()` 处理
3. **时间格式统一** - 必须使用 `formatTime()` 处理
4. **避免重复数据** - 评论中的头像不要包含在imageList中
5. **树形评论结构** - 使用children字段,最多支持2层嵌套

## 示例代码

```javascript
// 创建文章对象
const article = createEmptyArticle();
article.url = window.location.href;

// 提取标题
const titleEl = safeQuery(document, ['h1.title', 'h1']);
article.title = cleanText(titleEl.textContent);

// 提取时间
const timeEl = safeQuery(document, ['time', '[class*="time"]']);
article.publishTime = formatTime(timeEl.textContent);

// 提取作者
const authorEl = safeQuery(document, ['[class*="author"]']);
article.author.nickname = cleanText(authorEl.textContent);

// 提取段落
const paragraphs = safeQueryAll(document, ['p']);
paragraphs.forEach(p => {
    const text = cleanText(p.textContent);
    if (text) article.contentList.push(text);
});

// 提取图片
const images = safeQueryAll(document, ['img']);
images.forEach(img => {
    const imageObj = extractImage(img);
    if (imageObj && imageObj.src) {
        article.imageList.push(imageObj);
    }
});

// 提取评论
const commentItems = safeQueryAll(document, ['.comment']);
commentItems.forEach(item => {
    const avatar = safeQuery(item, ['img'])?.src || '';
    const nickname = cleanText(safeQuery(item, ['.name'])?.textContent);
    const content = cleanText(safeQuery(item, ['.content'])?.textContent);
    const time = formatTime(safeQuery(item, ['.time'])?.textContent);

    if (nickname && content) {
        article.commentList.push(createComment(avatar, nickname, time, content, []));
    }
});

// 验证数据
const validation = validateArticle(article);
if (!validation.valid) {
    throw new Error('Validation failed: ' + validation.errors.join(', '));
}

return article;
```

## 支持的平台
1. 今日头条 (Toutiao) ✅
2. 百度新闻 (Baidu) ✅
3. 网易新闻 (NetEase) 🔄
4. 搜狐新闻 (Sohu) 🔄
5. 腾讯新闻 (Tencent) 🔄
6. 澎湃新闻 (Pengpai) 🔄
7. 中国日报 (ChinaDaily) 🔄
