# 更新日志 (Changelog)

## [1.1.1] - 2024-11-20

### 🐛 Bug修复

#### 网易新闻 (netease.js)
- **问题1**: imageList包含了推荐文章的缩略图(140×88)
- **原因**: 使用`.post_main`作为内容容器,包含了`.post_next`推荐区域
- **修复**: 优先使用`.post_body`作为内容容器,排除`.post_next`区域
- **效果**: imageList现在只包含文章正文中的图片

- **问题2**: 评论提取失败(找到29条但全部跳过)
- **原因**: 通用选择器无法匹配网易特殊的评论结构(`.single-tie`, `.tie-author`, `.tie-cnt`)
- **修复**:
  - 评论项: 改用`document.querySelectorAll('.single-tie')`直接查询
  - 昵称: 使用`.tie-bdy > .bdy-inner > .tie-author .name`精确匹配
  - 内容: 使用`.bdy-inner > .tie-cnt`避免提取楼中楼评论
  - 计数: 从`.tie-actCount`链接提取评论总数
- **效果**: 可以正确提取网易跟贴评论

#### 中国日报 (chinadaily.js)
- **问题**: imageList包含了`.Artical_Title`容器内的广告图片(`class="ad"`)
- **原因**: 使用`.Artical_Body_Left`作为内容容器,包含了`.Artical_Title`广告区域
- **修复**:
  - 标题提取: 使用`.Artical_Title h1`而不是`.Artical_Title`容器
  - 内容提取: 优先使用`#Content`容器,排除`.Artical_Title`区域
- **效果**: imageList和contentList不再包含广告内容

#### 搜狐新闻 (sohu.js)
- **问题1**: 作者信息提取不完整
- **修复**: 优先从责任编辑(`data-role="editor-name"`)提取作者,其次尝试来源链接,最后使用"Sohu"作为兜底
- **效果**: 正确提取作者昵称

- **问题2**: 评论数显示23但实际提取0条
- **原因**: `safeQueryAll`无法找到搜狐的`.comment-item`元素(可能因动态渲染或Vue属性)
- **修复**: 改用`document.querySelectorAll('.comment-item')`直接查询,不依赖`safeQueryAll`
- **效果**: 可以正确提取搜狐评论列表

#### 百度新闻 (baidu.js)
- **问题**: 段落和图片提取失败(动态class名变化)
- **原因**: 使用`.dpu8C`、`._2kCxD`等哈希class名,每次加载会变化
- **修复**:
  - 段落提取: 改用稳定的`span.bjh-p`选择器
  - 图片提取: 改用通用的`img`选择器,不依赖动态class
  - 过滤: 添加长度检查(>10字符)过滤短标签
- **效果**: 可以稳定提取百度文章内容,不受class名变化影响

#### 腾讯新闻 (formatter.js)
- **问题1**: 懒加载图片无法提取(宽高为0导致被过滤)
- **原因**: `extractImage()`在无法获取图片尺寸时过于严格地过滤
- **修复**: 只在能确定尺寸且尺寸过小时才过滤,无法获取尺寸的图片不过滤
- **效果**: 腾讯新闻的懒加载图片现在可以正常提取

- **问题2**: 类名包含"ad"的合法图片被误过滤
- **示例**: `class="qnt-img-img qnr-img-lazy-load-img"`中"load"包含"ad"导致被误判
- **原因**: 使用`classList.includes(skipClass)`进行子串匹配
- **修复**: 改为精确匹配完整类名,将className按空格分割后使用数组`.includes()`
- **效果**: 只有完全匹配类名(如`class="ad"`)才会被过滤,避免误判

---

## [1.1.0] - 2024-11-20

### ✨ 新增功能

#### 媒体过滤增强
- **图片过滤**: `extractImage()`现在自动过滤非内容图片
  - 按class过滤: 自动跳过avatar, logo, icon, emoji, qrcode, ad等
  - 按尺寸过滤: 跳过宽或高 < 50px的小图标
  - 按URL过滤: 跳过blank.gif, placeholder, loading.gif等

- **视频过滤**: `extractVideo()`现在自动过滤非内容视频
  - 按class过滤: 自动跳过ad, advertisement, banner, promo等
  - 按URL过滤: iframe只保留真实视频平台(腾讯视频、YouTube、优酷、B站等)

#### 文档完善
- 新增 `MEDIA_EXTRACTION_GUIDE.md` - 媒体提取过滤机制说明
- 新增 `CHANGELOG.md` - 版本更新日志

### 🐛 Bug修复

#### 网易新闻 (netease.js)
- **问题**: contentList包含了"特别声明"和评论内容
- **修复**:
  - 添加停止标识,遇到"特别声明"、"网友评论"等关键词时停止提取
  - 过滤包含"跟贴"、"参与"等评论相关文字的段落
  - 过滤日期格式文本(YYYY-MM-DD)
- **提交时间**: 数据提取失败 → 无法提取发布时间
- **修复**:
  - Method 1: 从`<html data-publishtime>`属性提取
  - Method 2: 从`<meta property="article:published_time">`提取
  - Method 3: 从`#contain[data-ptime]`属性提取
  - Method 4: 从DOM元素文本提取(兜底)

#### 中国日报 (chinadaily.js)
- **问题**: 缺少publishTime和author.nickname导致验证失败
- **修复**:
  - **发布时间**:
    - Method 1: 从`<meta name="publishdate">`提取
    - Method 2: 从`.Artical_Share_Date`元素提取
    - Method 3: 从info容器元素提取
  - **作者信息**:
    - Method 1: 从`<meta name="author">`提取
    - Method 2: 从info容器元素提取
    - Method 3: 使用"China Daily"作为兜底值

### 🔧 优化改进

#### formatter.js增强
- `extractImage()`: 增加了10+种过滤规则,确保只提取内容图片
- `extractVideo()`: 增加了广告过滤和视频平台验证
- 提高了数据质量和准确性

#### 所有爬虫
- ✅ imageList现在只包含文章内容图片
- ✅ videoList现在只包含文章内容视频
- ✅ 排除了头像、logo、图标、广告等非内容媒体

---

## [1.0.0] - 2024-11-20 (初始版本)

### ✨ 核心功能

#### 统一数据格式
- 创建 `schema.js` - 定义标准数据结构
- 创建 `formatter.js` - 提供11个工具函数
- 实施统一的字段命名规范

#### 7个平台爬虫实现
- ✅ 今日头条 (Toutiao)
- ✅ 百度新闻 (Baidu)
- ✅ 网易新闻 (NetEase)
- ✅ 搜狐新闻 (Sohu)
- ✅ 腾讯新闻 (Tencent)
- ✅ 澎湃新闻 (Pengpai)
- ✅ 中国日报 (ChinaDaily)

#### 核心特性
- 统一的数据结构 (10个标准字段)
- 智能选择器系统 (3-5个备选选择器)
- 强大的时间格式化 (支持相对时间和多种格式)
- 完整的数据验证机制
- 树形评论结构支持

#### 文档体系
- `UNIFIED_SCHEMA.md` - 完整规范文档
- `EXAMPLE_USAGE.md` - 使用示例
- `QUICK_REFERENCE.md` - 快速参考
- `UNIFIED_FORMAT_SUMMARY.md` - 实施总结

---

## 版本命名规范

格式: `[主版本].[次版本].[修订版本]`

- **主版本**: 重大架构变更或不兼容更新
- **次版本**: 新功能添加或重要改进
- **修订版本**: Bug修复和小优化

## 图标说明

- ✨ 新增功能
- 🐛 Bug修复
- 🔧 优化改进
- 📝 文档更新
- ⚠️ 重要提醒
- 💥 破坏性变更

---

**维护者**: AiMaster Team
**最后更新**: 2024-11-20
