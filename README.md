# AiMaster

AiMaster(AI大师) 是一个谷歌浏览器的插件，用于在网易、头条、腾讯等新闻平台一键改写文章，并且支持在公众号、头条等平台将改写的文章自动插入编辑器。

## 后台管理页面
<!-- 显眼的按钮样式，点击直接跳转 -->
<a href="https://aimedia.daniu7.cn" target="_blank" style="display: inline-block; padding: 12px 30px; background-color: #1677ff; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
  点击进入后台管理系统
</a>


## 项目结构

```
AiMaster/
├─ manifest.json        # 插件配置
├─ background.js        # 后台脚本（service worker）
├─ content.js           # 注入网页执行的脚本
├─ popup.html           # 插件弹窗UI
├─ popup.js             # 插件弹窗逻辑
├─ crawlers/            # 平台爬虫模块（模块化）
│  ├─ README.md         # 爬虫模块说明
│  ├─ toutiao.js        # 今日头条爬虫 ✅
│  ├─ baidu.js          # 百度新闻爬虫 ✅
│  ├─ pengpai.js        # 澎湃新闻爬虫 ✅
│  ├─ sohu.js           # 搜狐新闻爬虫 ✅
│  ├─ tencent.js        # 腾讯新闻爬虫 ✅
│  ├─ netease.js        # 网易新闻爬虫 ✅
│  └─ chinadaily.js     # 中国日报爬虫 ✅
└─ icons/               # 图标文件夹
   └─ README.md         # 图标说明
```

## 功能特性

### 支持的平台

**新闻爬取平台：**
- ✅ **今日头条** (toutiao.com) - 完整实现
  - 支持提取：标题、发布时间、作者、内容列表、图片列表、视频列表
  - 支持提取：评论数量、评论详情（用户、头像、昵称、内容、时间、点赞、回复）
- ✅ **百度新闻** (baijiahao.baidu.com) - 完整实现
  - 支持提取：标题、发布时间、作者、地址、内容、图片、视频
  - 支持提取：评论数量、评论详情
- ✅ **澎湃新闻** (thepaper.cn) - 完整实现
  - 支持提取：标题、发布时间、作者、来源、内容、图片、视频
  - 支持提取：评论数量、评论详情（点赞、时间、地址）
- ✅ **搜狐新闻** (sohu.com) - 完整实现
  - 支持提取：标题、发布时间、作者、内容、图片
  - 支持提取：评论数量、评论详情
- ✅ **腾讯新闻** (qq.com) - 完整实现
  - 支持提取：标题、发布时间、作者、内容、图片、视频
  - 支持提取：评论数量、评论详情
- ✅ **网易新闻** (163.com) - 完整实现
  - 支持提取：标题、发布时间、作者、内容、图片、视频
  - 支持提取：评论数量、评论详情
- ✅ **中国日报** (chinadaily.com.cn) - 完整实现
  - 支持提取：标题、发布时间、作者、内容、图片、视频
  - 支持提取：评论数量、评论详情

**发布平台：**
- 微信公众号编辑器
- 头条号编辑器
- 其他通用编辑器（自动检测）

### 核心功能

- ✅ 自动检测当前新闻平台
- ✅ 智能爬取文章内容（标题、正文、作者、图片）
- ✅ 提交文章到后端进行 AI 改写
- ✅ 实时查看改写进度
- ✅ 自动插入内容到编辑器 DOM
- ✅ 任务列表管理
- ✅ 可配置后端 API 地址

## 安装使用

### 1. 准备图标文件

在 `icons/` 文件夹中添加以下三个尺寸的图标：
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

详见 `icons/README.md`

### 2. 加载插件到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 AiMaster 项目文件夹


## 使用流程

### 爬取文章

1. 访问任意支持的新闻平台文章页面
2. 点击 AiMaster 插件图标
3. 插件会自动检测当前平台
4. 点击"爬取文章"按钮
5. 文章内容将自动提交到后端

### 查看进度

1. 点击"刷新状态"按钮查看任务列表
2. 每个任务显示：
   - 文章标题
   - 处理状态（爬取中/AI改写中/已完成/失败）
   - 进度百分比

### 发布文章

1. 等待任务状态变为"已完成"
2. 打开目标平台的编辑器页面（如微信公众号后台）
3. 点击插件图标
4. 点击对应任务的"发布到编辑器"按钮
5. 改写后的内容将自动插入到编辑器中

## 后端 API 要求

插件需要后端提供以下 API 接口：

### POST /api/articles
提交文章进行处理

**请求体：**
```json
{
  "user": "admin",
  "platform": "netease",
  "article": {
    "title": "文章标题",
    "content": "文章内容",
    "author": "作者",
    "publishTime": "2024-01-01",
    "images": [{"src": "url", "alt": "描述"}]
  }
}
```

**响应：**
```json
{
  "success": true,
  "task_id": 1,
  "message": "任务已创建"
}
```

### GET /api/tasks?user=admin
获取任务列表

**响应：**
```json
[
  {
    "id": "task_123",
    "title": "文章标题",
    "platform": "netease",
    "status": "completed",
    "progress": 100,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/tasks/:task_id
获取任务详情

**响应：**
```json
{
  "id": "task_123",
  "status": "completed",
  "rewrittenArticle": {
    "title": "改写后标题",
    "content": "改写后内容"
  }
}
```

## 开发说明

### 模块化爬虫架构

从 v1.0 开始，每个平台的爬虫都独立为单独的 JS 模块，存放在 `crawlers/` 文件夹中。这样的好处是：

1. **易于维护** - 每个平台独立维护，不会相互影响
2. **易于调试** - 可以单独测试每个爬虫模块
3. **易于扩展** - 添加新平台只需创建新文件
4. **代码清晰** - 每个文件职责单一

详细说明请参考 `crawlers/README.md`

### 添加新的爬虫平台

在 `crawlers/` 中创建新的平台文件，例如 `newplatform.js`：

```javascript
const NewPlatformCrawler = {
    name: 'Platform Name',

    match: (url) => {
        return url.includes('newplatform.com');
    },

    crawlArticle: () => {
        return {
            title: '',
            publishTime: '',
            author: '',
            contents: [],
            images: [],
            videos: [],
            commentCount: 0,
            comments: []
        };
    },

    crawl: () => {
        return NewPlatformCrawler.crawlArticle();
    }
};

if (typeof window !== 'undefined') {
    window.NewPlatformCrawler = NewPlatformCrawler;
}
```

然后在 `manifest.json` 的 `content_scripts` 中添加：

```json
"js": [
    "crawlers/toutiao.js",
    "crawlers/newplatform.js",
    "content.js"
]
```

最后在 `content.js` 中注册：

```javascript
PLATFORMS.newplatform = {
    name: 'Platform Name',
    match: (url) => url.includes('newplatform.com'),
    crawler: null,
    publisher: null
};

if (typeof window.NewPlatformCrawler !== 'undefined') {
    PLATFORMS.newplatform.crawler = () => window.NewPlatformCrawler.crawl();
}
```

### 测试爬虫模块

在浏览器控制台中测试：

```javascript
// 测试头条爬虫
const result = ToutiaoCrawler.crawl();
console.log('Crawled data:', result);
console.log('Title:', result.title);
console.log('Comments:', result.comments);
```

### 添加新的发布平台

为平台添加 publisher 函数：

```javascript
PLATFORMS.newplatform.publisher = (article) => publishToEditor(article, 'newplatform');
```

并在 `publishToEditor` 函数中添加对应的选择器。

## 注意事项

1. 默认用户名为 `admin`（调试阶段）
2. 需要自行实现后端 API 服务
3. 如果平台页面结构更新，可能需要调整选择器
4. 部分平台可能需要手动复制内容到编辑器
5. 确保后端 API 开启了 CORS 支持

## License

MIT
