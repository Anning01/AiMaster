# 图标说明

插件需要三个尺寸的图标：

- `icon16.png` - 16x16 像素
- `icon48.png` - 48x48 像素
- `icon128.png` - 128x128 像素

## 快速生成图标

你可以使用以下方法生成图标：

1. **在线工具**：访问 https://www.favicon-generator.org/ 上传一张图片，自动生成不同尺寸

2. **使用 ImageMagick**（如果已安装）：
```bash
# 从一张大图生成不同尺寸
convert source.png -resize 16x16 icon16.png
convert source.png -resize 48x48 icon48.png
convert source.png -resize 128x128 icon128.png
```

3. **临时方案**：如果只是测试，可以暂时注释掉 manifest.json 中的 icons 相关配置

## 建议的图标设计

- 使用 AI 或机器人相关的图标
- 主色调建议使用紫色系（与 popup 界面配色一致）
- 简洁明了，在小尺寸下也能清晰识别
