# Azure Jenny 音频替换检查记录

工作分支：`azure-jenny-audio-20261012`，基于交接分支 `azure-speech-handoff-20261012` 的 `d070b76a413300a3d4124428ddf77c30d56e7805`。

本次只提交候选版，不修改正式发布分支或部署网站。Azure 音频与软件检查的实际结果会在全部执行完成后写入本文件，不把旧版音频检查结果当成本次验收。

## 生成与清单

已生成 398 段 Azure Speech MP3，使用 `en-US-JennyNeural`、`en-US`、默认风格、正常语速和 `audio-24khz-96kbitrate-mono-mp3`。网络请求通过继承的环境代理，使用 HTTPS REST 并保留证书校验。密钥只从 `SPEECH_KEY` 使用，不保存值、请求头或原始服务错误正文。

生成器串行请求，间隔至少 4 秒、60 秒滚动窗口不超过 20 次；有限重试遵守 Retry-After。每段以实际 SSML／格式／规则计算指纹，已验证缓存无需再次合成；文件 SHA-256、完整解码和非静音检查通过才会接受。

已将全部 398 段 MP3、v3 清单及公开审核数据替换到网页，移除 398 段旧 MP3。新文件共 9,904,320 字节（9.45 MiB），解码总时长 825.36 秒，单段 1.872～3.912 秒；各段生成配置一致。网页脚本缓存参数更新为 `azure-jenny-v3-20261012`。

真实请求共 398 次：先生成 2 段样本，再复用它们并请求余下 396 段，无失败重试。后续只读 `--verify` 验证 398 段通过，新增请求为 0；音频映射、文件 SHA-256、完整解码及非静音均核对。保守 SSML 字符账本为 57,906，英文文本为 5,547 字符；该值不是 Azure 剩余额度或账单查询。公开汇总见 [data/azure-build-report.json](data/azure-build-report.json)。

本地缓存和额度账本留在被忽略的 `.audio-build/`，不随网页交付。已提交 MP3 无需为试听再次生成；开发环境保留有效缓存可断点续跑，单纯克隆仓库不包含该本地缓存。

## 实际检查结果

| 检查 | 结果 |
|---|---|
| Azure 真实合成、只读缓存验证 | 398 段成功；后续只读验证 398/398，零新增请求 |
| 生成器模拟回归 | 26 项通过，含限流、重试、断点复用、密钥保护及审核元数据 |
| 题目与存储契约保留 | 1,602 道完整题目对象与 ID 严格一致；app、备份、5 份题库共 7 文件 SHA-256 不变；原存储键不变 |
| 最终练习浏览器检查 | 手机／桌面布局、首次正确率、防双击、错题重练、刷新保存通过 |
| 最终备份浏览器检查 | 14 组通过，含真实下载恢复、混合新旧记录、重复导入幂等、多标签冲突及写入失败保护 |
| 最终试听页浏览器检查 | 5 组通过，含 Hello／Hi 实际播放、搜索、连续点击／停止、失败提示、不写记录及手机无溢出 |
| 全量静态映射／解码 | 全 398 段真实 SSML、配置／数据集指纹、SHA-256、字节数、完整解码、非静音及清单覆盖通过，无旧 MP3 残留 |
| 本体 MP3 流程及旧缓存升级 | 9 组通过；无系统语音时真实播放、连续点击、停止／后台、听辨答案保护、原降级逻辑；真实旧 v2 清单／MP3 缓存命中后同源刷新加载 v3 与新哈希，并保留中文／英语首次记录、错题及无关设置 |
| 全 398 段真实浏览器播放 | 398/398 具 metadata、canplay、playing、timeupdate、ended，零媒体错误；4 倍速、静音、8 路并行，29.7 秒，仅作播放检查 |
| 本地 file://、华为实体设备、全库人工听感 | file:// 被当前浏览器管理策略阻止而跳过；华为实体设备与全库人工听感未验收 |

题目和保存恢复测试保持原有备份协议，未通过音频替换要求用户清除浏览器数据。

可复跑的主要检查：

```sh
python3 tests/azure-audio.test.py
node tests/questions.test.js
node tests/record-backup.test.js
node tests/speech-text.test.js
node tests/audio.test.js --decode
node tests/audio-player.test.js
node tests/audio-all.browser.test.js
node tests/audio.browser.test.js
node tests/audio-review.browser.test.js
node tests/browser.test.js
node tests/backup.browser.test.js
```

Playwright 和 `/usr/bin/chromium` 用于上述浏览器测试，FFmpeg 用于全量解码。生成器模拟测试不会请求 Azure；对已交付音频运行静态／浏览器检查也无需密钥。真实生成缓存的只读验证使用 `python3 scripts/build-azure-audio.py --verify`，它不会新增 Azure 请求。

## 保留学习数据

保留所有题目对象及 ID、答案、`learning-garden-v1`、首次作答记录、错题和原备份协议。不清除浏览器数据；候选版正常刷新后加载新脚本缓存参数与新音频路径。不同网址／端口的浏览器存储彼此独立，需要迁移时沿用备份恢复功能。

## 试听

[下载本工作分支 ZIP](https://github.com/cwy392133161/my-first-codex/archive/refs/heads/azure-jenny-audio-20261012.zip)，完整解压，在项目目录运行 `python3 -m http.server 8000 --bind 127.0.0.1`，访问 `http://localhost:8000/audio-review.html`。可搜索全部 398 段，先试听 Hello、Hi、数字、颜色、close、read、minute、th／t 示例、句子和作品介绍。试听页只播放项目 MP3，不写学习记录。

当前测试环境因浏览器管理策略 `ERR_BLOCKED_BY_ADMINISTRATOR` 无法直接打开 file:// 页面；本地双击试听记为跳过，HTTP 入口单独验证。

尚未逐条完成人工发音审听，也未使用华为实体设备验收。完整解码、非静音、文本映射和浏览器播放通过不等于全部发音已确认。
