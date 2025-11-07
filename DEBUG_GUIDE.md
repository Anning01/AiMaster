# 调试指南 - 查看详细日志

所有关键步骤现在都会输出详细的控制台日志，方便调试和排查问题。

## 如何打开控制台

### 方法1：在文章页面查看日志

1. 打开今日头条文章页面
2. 按 `F12` 或右键点击页面选择"检查"
3. 切换到 "Console" (控制台) 标签
4. 点击插件按钮进行爬取
5. 查看控制台输出

### 方法2：在插件弹窗查看日志

1. 右键点击浏览器工具栏的 AiMaster 图标
2. 选择"检查"或"审查弹出内容"
3. 会打开一个新的开发者工具窗口
4. 切换到 "Console" 标签
5. 点击"爬取文章"按钮
6. 查看日志输出

## 日志输出位置

根据操作不同，日志会在不同的控制台输出：

| 操作 | 日志输出位置 |
|------|------------|
| 平台检测 | 文章页面控制台 |
| 文章爬取 | 文章页面控制台 |
| 评论提取 | 文章页面控制台 |
| 提交后端 | 插件弹窗控制台 |
| 任务列表 | 插件弹窗控制台 |

## 日志示例

### 成功爬取的日志流程

**文章页面控制台：**
```
=== Toutiao 爬虫开始 ===
当前页面 URL: https://www.toutiao.com/article/...
提取标题...
标题: 武汉有人已确诊，严重可致死！家里有这个的快自查
提取元信息...
发布时间: 2025-11-05 08:40
作者: 闽南网 链接: https://...
提取文章内容...
找到内容容器
找到段落数量: 42
提取段落数量: 38
找到图片数量: 0
提取图片数量: 0
找到视频数量: 0
提取视频数量: 0
提取评论数据...
--- 开始提取评论 ---
评论总数: 9
找到评论项数量: 3
处理评论 #1...
评论 #1: {nickname: '端庄优雅花猫YU', content: '鸽子最脏了，这玩意传播疾病，根本就不能养...', likes: 3, replyCount: 1}
处理评论 #2...
评论 #2: {nickname: '慢悠悠', content: '人传人吗？我家邻居就在楼顶喂鸽子...', likes: 1, replyCount: 0}
处理评论 #3...
评论 #3: {nickname: '飘泊的浮萍', content: '我们小区有几家在楼顶养鸽子...', likes: 1, replyCount: 0}
--- 评论提取完成 ---
成功提取评论数: 3
评论数量: 9
实际提取评论数: 3
=== Toutiao 爬虫完成 ===
最终数据摘要: {title: '武汉有人已确诊...', author: '闽南网', paragraphs: 38, images: 0, videos: 0, comments: 3}
```

**插件弹窗控制台：**
```
=== 开始爬取文章 ===
当前标签页: https://www.toutiao.com/article/...
发送爬取消息到 content script...
Content script 响应: {success: true, platform: 'toutiao', platformName: 'Toutiao', article: {...}}
爬取成功，文章数据: {platform: 'toutiao', title: '武汉有人已确诊...', contentLength: 38, imagesCount: 0, commentsCount: 9}
提交数据到后端: http://localhost:8000
请求体: {
  "user": "admin",
  "platform": "toutiao",
  "article": {
    "title": "武汉有人已确诊...",
    ...
  }
}
后端响应状态: 200 OK
后端响应数据: {success: true, taskId: 'task_123'}
=== 爬取流程结束 ===
```

### 失败时的日志

#### 1. 后端连接失败

```
=== 开始爬取文章 ===
当前标签页: https://www.toutiao.com/article/...
发送爬取消息到 content script...
Content script 响应: {success: true, platform: 'toutiao', ...}
爬取成功，文章数据: {...}
提交数据到后端: http://localhost:8000
=== 爬取过程出错 ===
错误类型: TypeError
错误消息: Failed to fetch
错误堆栈: TypeError: Failed to fetch at ...
```

**解决方法：**
- 检查后端服务是否启动
- 检查后端地址配置是否正确
- 检查后端是否开启了 CORS

#### 2. 爬取失败

```
=== Toutiao 爬虫开始 ===
当前页面 URL: https://www.toutiao.com/article/...
提取标题...
未找到标题元素 (.article-content h1)
提取元信息...
未找到元信息容器 (.article-meta)
提取文章内容...
未找到内容容器 (article.syl-article-base)
提取评论数据...
--- 开始提取评论 ---
未找到评论计数元素 (.ttp-comment-wrapper .title span)
找到评论项数量: 0
--- 评论提取完成 ---
成功提取评论数: 0
评论数量: 0
实际提取评论数: 0
标题为空，爬取失败
=== Toutiao 爬虫失败 ===
错误类型: Error
错误消息: Failed to extract article title
错误堆栈: Error: Failed to extract article title at ...
```

**解决方法：**
- 确认页面是否完全加载
- 检查页面结构是否变化
- 使用浏览器检查元素工具验证选择器

## 常见问题排查

### 1. Failed to fetch

**错误位置：** 插件弹窗控制台

**原因：**
- 后端服务未启动
- 后端地址错误
- 后端未开启 CORS
- 网络连接问题

**排查步骤：**
1. 检查后端服务是否运行：`curl http://localhost:8000/api/tasks`
2. 检查插件配置的后端地址
3. 查看后端日志是否有 CORS 错误

### 2. Failed to extract article title

**错误位置：** 文章页面控制台

**原因：**
- 页面结构变化
- 选择器不匹配
- 页面未完全加载

**排查步骤：**
1. 查看控制台日志，找到哪个选择器未找到元素
2. 在控制台手动测试选择器：
   ```javascript
   document.querySelector('.article-content h1')
   ```
3. 如果返回 null，说明选择器需要更新
4. 使用浏览器"检查元素"找到正确的选择器
5. 修改 `crawlers/toutiao.js` 中的选择器

### 3. Content script 无响应

**错误位置：** 插件弹窗控制台

**原因：**
- Content script 未加载
- 页面刷新导致 script 失效

**排查步骤：**
1. 刷新文章页面
2. 重新加载插件
3. 检查文章页面控制台是否有加载日志

## 手动测试爬虫

在文章页面控制台直接测试：

```javascript
// 测试爬虫
const result = ToutiaoCrawler.crawl();
console.log(result);

// 测试各部分
console.log('标题:', result.title);
console.log('作者:', result.author);
console.log('段落数:', result.contents.length);
console.log('评论数:', result.comments.length);

// 查看具体数据
console.log('第一段:', result.contents[0]);
console.log('第一条评论:', result.comments[0]);
```

## 启用更多日志

如需更详细的日志，可以在 `crawlers/toutiao.js` 中添加更多 console.log：

```javascript
// 例如：查看每个段落
paragraphs.forEach((p, index) => {
    const text = p.textContent.trim();
    console.log(`段落 ${index}:`, text.substring(0, 50));
    // ...
});
```

## 提交 Bug

如果遇到问题，请提供：
1. 完整的控制台日志（截图或复制）
2. 出问题的文章 URL
3. 浏览器版本
4. 插件版本
