# 今日头条爬虫模块 - 快速测试

## 文件位置

`crawlers/toutiao.js`

## 提取的数据结构

```javascript
{
    title: "文章标题",
    publishTime: "2025-11-05 08:40",
    author: "作者名",
    authorUrl: "作者主页URL",
    contents: [
        {
            type: "text",
            content: "段落内容",
            dataTrack: "段落追踪ID"
        },
        // ... 更多段落
    ],
    images: [
        {
            src: "图片URL",
            alt: "图片描述",
            dataSrc: "懒加载图片URL"
        },
        // ... 更多图片
    ],
    videos: [
        {
            src: "视频URL",
            poster: "封面图URL",
            type: "video/iframe"
        },
        // ... 更多视频
    ],
    commentCount: 9,
    comments: [
        {
            userId: "用户ID",
            userUrl: "用户主页URL",
            avatar: "头像URL",
            nickname: "用户昵称",
            content: "评论内容",
            time: "23小时前",
            likes: 3,
            replyCount: 1,
            replies: []
        },
        // ... 更多评论
    ]
}
```

## 快速测试步骤

### 1. 加载插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 AiMaster 文件夹

### 2. 访问头条文章

打开任意今日头条文章，例如：
- https://www.toutiao.com/article/xxx

### 3. 测试爬虫

打开 Chrome DevTools (F12)，在控制台输入：

```javascript
// 测试爬取功能
const result = ToutiaoCrawler.crawl();
console.log('完整数据:', result);

// 查看标题
console.log('标题:', result.title);

// 查看作者
console.log('作者:', result.author);

// 查看内容段落数
console.log('段落数:', result.contents.length);

// 查看图片数
console.log('图片数:', result.images.length);

// 查看评论
console.log('评论数:', result.commentCount);
console.log('评论列表:', result.comments);

// 查看第一条评论
if (result.comments.length > 0) {
    console.log('第一条评论:', {
        昵称: result.comments[0].nickname,
        内容: result.comments[0].content,
        点赞: result.comments[0].likes
    });
}
```

### 4. 测试插件爬取

点击浏览器工具栏的 AiMaster 图标，应该会看到：
- 检测到的平台: "Toutiao"
- "爬取文章" 按钮变为可用状态

点击"爬取文章"按钮，文章数据会提交到后端。

## 选择器说明

根据你提供的 HTML 结构，使用了以下选择器：

| 数据项 | 选择器 |
|--------|--------|
| 标题 | `.article-content h1` |
| 发布时间 | `.article-meta span:first-child` |
| 作者 | `.article-meta .name a` |
| 内容段落 | `article.syl-article-base p` |
| 图片 | `article.syl-article-base img` |
| 视频 | `article.syl-article-base video, iframe[src*="video"]` |
| 评论数 | `.ttp-comment-wrapper .title span` |
| 评论列表 | `.comment-list > li` |
| 评论头像 | `.ttp-avatar img` |
| 评论昵称 | `.user-name .name` |
| 评论内容 | `.body .content` |
| 评论时间 | `.footer .time` |
| 评论点赞 | `.ttp-comment-like .inner span` |

## 常见问题

### Q: 爬取失败怎么办？

1. 检查页面结构是否变化
2. 打开控制台查看错误信息
3. 手动测试选择器：
   ```javascript
   document.querySelector('.article-content h1')
   ```

### Q: 如何修改选择器？

编辑 `crawlers/toutiao.js` 文件，修改对应的 `querySelector` 或 `querySelectorAll` 语句。

### Q: 如何添加更多数据提取？

在 `crawlArticle` 函数中添加新的提取逻辑，例如：

```javascript
// 提取阅读数
const readCountEl = document.querySelector('.read-count');
if (readCountEl) {
    article.readCount = readCountEl.textContent.trim();
}
```

## 下一步

- 实现网易新闻爬虫 (`crawlers/netease.js`)
- 实现腾讯新闻爬虫 (`crawlers/tencent.js`)
- 实现微信公众号爬虫 (`crawlers/weixin.js`)
