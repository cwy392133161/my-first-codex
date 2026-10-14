# iPhone 6 Plus 主屏幕版

目标：iPhone 6 Plus，iOS 12.5.x，竖屏414×736、横屏736×414。网页仍使用原网址：<https://cwy392133161.github.io/my-first-codex/>。

## 在 iPhone 上安装

1. 用 **Safari** 打开上面的原网址，刷新页面。先进入“学习记录”，点击“导出备份”：iOS 12 会显示备份文字，点击“复制备份文字”，粘贴到“备忘录”保存。自动复制失败时，长按已选中的文字选择“复制”。不要清空原记录。
2. 返回首页，点击 Safari 底部的 **分享按钮**（方框向上箭头），找到 **添加到主屏幕**。
3. 名称使用 **学习小乐园**，确认图标是绿色书本和小芽，点击“添加”。
4. 回到 iPhone 主屏幕，点击新图标启动。今后从这个图标打开，才能进入独立 Web App 模式；直接在 Safari 标签页打开网址仍是正常浏览器模式。

确认全屏：从主屏幕图标重新启动后，**Safari 地址栏和底部浏览器工具栏都不显示**；顶部仍有 iOS 系统的时间、电量等状态栏，这是本项目选择的 `default` 样式。页面允许上下滚动，可以旋转手机；没有锁缩放或方向。

已经添加过旧图标时，先保存备份，再移除旧主屏幕快捷方式、用刷新后的 Safari 页面重新添加。不要清除 Safari 网站数据。移除图标后的本地存储行为由 iOS 管理，保留备份后再操作。

## 保留与恢复记录

本次保留 `learning-garden-v1` 存储键、所有题号、首次答题统计、错题和原备份格式。代码不执行重置或迁移。

Safari 标签页与主屏幕 Web App 的存储可能分别管理。第一次从主屏幕打开后，如果记录为空：从备忘录复制完整备份文字，进入“学习记录 → 无法下载？使用备份文字”，粘贴到恢复框，点击“恢复这份备份”，核对确认窗口后恢复。导入会合并已有记录，重复导入不重复计数；取消确认不会改记录。原 Safari 记录保留。

现代浏览器仍可下载 JSON 备份、选择文件恢复；旧版改用 `FileReader` 读取文件。文字恢复与文件恢复使用同一校验和合并规则，最大5MB。错误文件、冲突记录或保存失败会保留当前数据。iOS 12 的海报／手册可用截图或浏览器支持的打印方式保存。

## 修改范围

| 文件 | 改动 |
|---|---|
| `index.html` | Apple全屏开关、名称、default状态栏、viewport、相对图标路径和兼容脚本缓存参数 |
| `assets/icons/apple-touch-icon.png` | 原创180×180不透明PNG主屏幕图标 |
| `app.js` | 删除可选链，FileReader、旧版确认窗口及文字备份／恢复，保留学习流程 |
| `speech-text.js`、`audio-player.js` | 删除可选链／空值合并；保留真实朗读文本、播放顺序和点击内同步play |
| `audio-review.js`、`audio-review.html` | 试听页旧版DOM API、脚本缓存和viewport |
| `style.css`、`audio-review.css` | clamp字号fallback、Flex margin间距、Grid间距别名、换行、确认窗口与文本框 |
| `pronunciation-preview/` 中的脚本与HTML | 旧试听目录同步语法、文件读取与确认降级；保留其历史题库和录音 |
| `tests/ios12.*`、相关音频测试 | 新增旧API／CSS模拟和子目录回归，更新缓存版本断言 |

以最新发布内容 `b635fe06715c9d2f4d775c33646a8ae4ca89b2de` 为基线：1742个完整题对象、学习目标、501段Azure MP3字节／路径、清单、审核数据和备份协议保持不变。没有生成新音频、调用Azure、加入前端外部依赖或密钥。

所有资源仍采用相对路径，在 `/my-first-codex/` 下加载；不使用指向域名根目录的 `/assets/` 或 `/app.js`。本次不添加Service Worker或离线下载机制；首次网站播放音频仍需要可用网络。

## 测试与实际限制

- 前端23个实际加载脚本按ES2019解析，拒绝可选链、空值合并，并检查目标Safari缺失API；这是语法检查，不等于Safari引擎实测。
- 本地Chromium使用iOS12 Safari的UA和414×736、736×414两方向，移除缺失的File／dialog／DOM能力，并让CSS实际使用不含clamp、Flex gap、anywhere等特性的fallback布局。检查学科练习、重试、重复点击、错题、刷新、备份、确认和子目录资源。
- MP3通过真实媒体播放、开始／结束事件及完整非静音解码检查；501段音频的路径和SHA-256未改变。没有把模拟音频成功当成真实播放。
- 环境没有旧版Safari、iOS12模拟器或iPhone 6 Plus实机；也没有可用的Playwright WebKit二进制。**尚未完成iOS12实机验收**，模拟`navigator.standalone`不能证明浏览器工具栏已被真实隐藏。
- 当前云网络禁止直接访问正式域名，线上HTTP和线上iPhone播放不能标记通过。GitHub的公开Actions页面可以核对构建／部署状态，须与直接线上交互验收分开记录。

开发者可运行：

```sh
node tests/ios12.test.js
node tests/ios12.browser.test.js
node tests/browser.test.js
node tests/backup.browser.test.js
node tests/audio.test.js --decode
node tests/audio-player.test.js
node tests/audio.browser.test.js
node tests/audio-review.browser.test.js
```

## 发布与核对

本次兼容代码提交为 `42919d04191ad09e0d581d5560f901e57a0a01d4`，已通过合并提交 `cc2516bc9f8b14ae20cd290c8cff037c80ff0909` 推送到 `learning-garden-windows`；开发分支 `ios12-webapp` 同样已保存。已核对远端成功，`main` 和Pages设置未修改。当前 `learning-record-backup` 仍为 `b635fe0`；推送指定分支后，公开Actions列表未出现本次提交的Pages任务，**原网址尚未发布兼容更新**。同步实际来源的范围等待用户选择。

本次用户指定更新 `learning-garden-windows`，不能只保存到`main`。同时，最近成功的真实Pages部署 [38488738173](https://github.com/cwy392133161/my-first-codex/actions/runs/38488738173) 显示：2026-10-14，`learning-record-backup`、提交`b635fe0`、Status Success。**当前实际发布来源与用户给出的分支名称存在差异。** 保持Pages设置不变时，线上更新需要将同一兼容版本同步到实际发布来源；是否同步按用户本次选择执行。

合并并推送后，在GitHub仓库 **Actions → pages build and deployment** 查看对应新提交的build、deploy成功；在iPhone Safari刷新原网址，重新添加主屏幕图标，并按上面的步骤检查。不要改域名、Pages来源或清空学习记录。

需要恢复旧内容时，在发布分支上提交恢复到上述基线文件树的新提交，保留Git历史，不强推覆盖。网页回退不会读取或重置孩子浏览器中的学习记录。

## 云环境直接线上验收

需要允许 `api.github.com` 和 `cwy392133161.github.io`，并保留已有 `eastus.tts.speech.microsoft.com` 及环境预设域名。此次保存这两个新增域名的环境配置草稿返回 `stale_base`（草稿基准版本过期），**保存未确认、运行时网络未改变**。需要直接线上验收时，应从当前环境设置打开新的设置任务，读取最新草稿后合并这些域名，不重复提交旧草稿。此操作属于云环境网络设置，不是GitHub Pages发布配置；不需要在聊天中提供任何密钥。
