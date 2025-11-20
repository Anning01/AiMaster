# 媒体提取过滤指南

## 概述
本文档说明了imageList和videoList如何确保只包含文章正文内容中的媒体,而过滤掉页面其他位置的UI元素、广告等。

## 过滤机制

### 1. 容器级别过滤
所有媒体提取都在**内容容器(contentEl)**内进行:
```javascript
const contentEl = safeQuery(document, [
    'article',
    '.article-content',
    // ... 其他内容容器选择器
]);

// 只在contentEl内查找
const images = safeQueryAll(contentEl, ['img']);
const videos = safeQueryAll(contentEl, ['video']);
```

### 2. 图片过滤规则

#### 2.1 按class过滤
自动跳过以下类型的图片:
- `avatar` - 头像
- `logo` - Logo
- `icon` - 图标
- `emoji` - 表情
- `qrcode` - 二维码
- `ad` / `advertisement` - 广告
- `banner` - 横幅
- `placeholder` - 占位符
- `blank` - 空白图
- `button` - 按钮图标
- `nav` - 导航图标

#### 2.2 按尺寸过滤
- 宽度或高度 < 50像素的图片会被跳过
- 这可以过滤掉大部分图标和UI元素

#### 2.3 按URL过滤
自动跳过以下URL的图片:
- `blank.gif`
- `placeholder`
- `loading.gif`
- `data:image/svg` (SVG占位符)

### 3. 视频过滤规则

#### 3.1 按class过滤
自动跳过以下类型的视频:
- `ad` - 广告视频
- `advertisement` - 广告
- `banner` - 横幅视频
- `promo` - 宣传视频

#### 3.2 按iframe URL过滤
对于iframe类型的视频,只保留包含以下关键词的:
- `video`
- `player`
- `v.qq.com` (腾讯视频)
- `youtube` (YouTube)
- `youku` (优酷)
- `bilibili` (B站)

## 实现示例

### 图片提取
```javascript
// 在内容容器内查找图片
const images = safeQueryAll(contentEl, [
    'img:not([class*="avatar"])',  // 排除头像
    'img'
]);

images.forEach((img) => {
    const imageObj = extractImage(img);
    // extractImage内部会进行过滤
    if (imageObj && imageObj.src) {
        article.imageList.push(imageObj);
    }
});
```

### 视频提取
```javascript
// 在内容容器内查找视频
const videos = safeQueryAll(contentEl, [
    'video',
    'iframe[src*="video"]',
    'iframe[src*="player"]'
]);

videos.forEach((video) => {
    const videoObj = extractVideo(video);
    // extractVideo内部会进行过滤
    if (videoObj && videoObj.src) {
        article.videoList.push(videoObj);
    }
});
```

## extractImage() 函数流程

```
输入: img元素
  ↓
检查class → 包含skipClasses? → 返回 null
  ↓ 否
检查尺寸 → 宽或高 < 50px? → 返回 null
  ↓ 否
提取src → src为空? → 返回 null
  ↓ 否
检查URL → 包含blank/placeholder? → 返回 null
  ↓ 否
返回图片对象 {src, alt, width, height}
```

## extractVideo() 函数流程

```
输入: video/iframe元素
  ↓
检查class → 包含ad/banner? → 返回 null
  ↓ 否
判断类型 → VIDEO标签
           ↓
         提取src, poster, duration
  ↓
判断类型 → IFRAME标签
           ↓
         检查URL → 不是视频平台? → 返回 null
           ↓ 否
         提取src
  ↓
src为空? → 返回 null
  ↓ 否
返回视频对象 {src, poster, duration, title}
```

## 为什么这样设计

### 1. 双层过滤
- **第一层**: 在内容容器内查找(容器级别)
- **第二层**: extract函数内部过滤(元素级别)

这种设计确保:
- 即使contentEl选择器不够精确,也能过滤掉非内容媒体
- 提高了爬虫的稳定性和准确性

### 2. 保守策略
采用"宁可少提,不可多提"的策略:
- 少提一些媒体: 影响较小
- 多提广告/UI: 严重污染数据

### 3. 可扩展性
如果需要添加新的过滤规则:
1. 在`formatter.js`中修改`skipClasses`数组
2. 添加新的URL或尺寸检查
3. 所有7个平台自动生效

## 常见问题

### Q1: 如何添加新的过滤规则?
A: 修改`crawlers/formatter.js`中的`extractImage()`或`extractVideo()`函数

### Q2: 为什么某些图片/视频没有提取到?
A: 可能被过滤规则误杀,检查:
- 图片尺寸是否 < 50px
- class是否包含skipClasses中的关键词
- URL是否包含过滤关键词

### Q3: 如何调整尺寸过滤阈值?
A: 修改`extractImage()`中的:
```javascript
if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
    return null;
}
```
将50改为其他值

### Q4: 能否只提取特定格式的图片?
A: 可以在`extractImage()`中添加格式检查:
```javascript
if (!src.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return null;
}
```

## 测试建议

### 1. 检查imageList
```javascript
console.log('图片数量:', article.imageList.length);
article.imageList.forEach((img, i) => {
    console.log(`图片 ${i + 1}:`, img.src);
    console.log('  尺寸:', img.width, 'x', img.height);
});
```

### 2. 检查videoList
```javascript
console.log('视频数量:', article.videoList.length);
article.videoList.forEach((video, i) => {
    console.log(`视频 ${i + 1}:`, video.src);
    console.log('  海报:', video.poster);
});
```

### 3. 验证无广告
- 检查imageList中是否有logo/icon
- 检查videoList中是否有广告视频
- 检查URL是否都是真实内容

## 未来优化方向

1. **机器学习**: 使用图像识别判断是否为内容图片
2. **智能尺寸**: 根据页面整体图片尺寸自适应阈值
3. **OCR检测**: 检测图片中的文字,过滤掉纯文字图标
4. **视频时长**: 过滤掉时长 < 3秒的短视频(可能是动画)

---

**最后更新**: 2024-11-20
**版本**: 1.1
