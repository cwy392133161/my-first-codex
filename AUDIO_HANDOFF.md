# Azure 音频替换：新任务接续说明

交接分支：`azure-speech-handoff-20261012`。代码基于 `azure-speech-audio` 的 `d4cd2653b5a6fbce42e8d32ae6d4f9303523a01f`，包含完整网页、题库、旧音频、Azure 生成脚本及测试。

## 本次保存时的实际状态

- 用户已说明：Azure Speech 在另一个新任务中验证成功。后续应复用该任务的安全配置，无需重新创建资源或向聊天索取密钥。
- 已选定 `eastus`、F0、`en-US-JennyNeural`、默认风格、正常语速。
- 当前工作区在保存前是干净的，没有未提交源码；本次新增接续说明并更新过时的状态文字。
- 本工作区没有 `.audio-build/azure/`，因此没有保存真实 Azure MP3、生成缓存或验证日志。另一个任务的本地文件不在本次快照中；如它已有生成产物或未提交代码，应在那里另行保存或安全带入接续任务。
- 当前分支的 `data/audio-manifest.js` 仍是版本 2：Kokoro、`bf_emma`、英式英语、398 段。这不是 Azure Jenny 音频。
- 正式网站未更新。本次不改 `main`、`learning-record-backup` 或 `learning-garden-windows`。
- 正式网站仍由 `learning-record-backup` 发布；保存前两个发布分支都在 `34a0d8ab850aff94b36f126a2082e025bdd81d67`。它们保留旧首页，并包含之前独立发布的 `pronunciation-preview/`。

## 必须保留的约束

- 保留所有题目 ID、题目含义、首次作答记录、错题、备份协议及 `learning-garden-v1` 本地存储键。
- 网站只播放预生成 MP3，不调用 Azure，不向 Azure 上传学习记录。
- 密钥只从安全配置中的 `SPEECH_KEY` 读取；区域使用 `SPEECH_REGION=eastus`。不要将密钥、请求头、环境文件或原始服务错误正文写入仓库或日志。
- `.env*`、`.audio-build/`、Python 缓存继续由 `.gitignore` 排除。不要为了保存代码执行 `git add -f` 添加这些内容。
- 用户当前要求暂不更新正式网站。完成音频替换和检查后，先给出可审阅结果，等待用户的新发布指令。

## 已完成的生成工具

`scripts/build-azure-audio.py` 仅需 Python 3、Node、FFmpeg：

- 1,517 个朗读入口归为 398 段；相同文本复用音频。
- 以每段实际 SSML、输出格式和生成规则计算指纹；新增或修改内容只请求对应的新音频。
- F0 串行请求，默认间隔 4 秒，同时保留 20 次／60 秒滚动窗口；重试也计入。
- 单实例锁、持久限流账本、字符预算、Retry-After、有限重试、断点续跑。
- 缓存必须通过指纹、文件 SHA-256、完整 MP3 解码及非静音检查。
- 默认 Jenny、默认风格、正常语速；当前 close/read/reads/minute/minutes 的教学词义有明确 IPA 读音。
- 输出仅写入 `.audio-build/azure/`，完整成功后才写暂存清单；不会自动覆盖网页或部署。

上一阶段 26 项 Azure 模拟测试及题库、备份、朗读文本检查通过。这不是本次对真实 Azure 合成的复测，也不是人工逐条发音审核。

## 下一步：生成和验证

先检出本交接分支，查看已验证任务是否有有效缓存可复用；不要把其密钥文件带入仓库。

```sh
python3 scripts/build-azure-audio.py --dry-run
python3 scripts/build-azure-audio.py --limit 2
python3 scripts/build-azure-audio.py
python3 scripts/build-azure-audio.py --verify
```

先确认 Hello、Hi 的真实请求成功、MP3 可播放，再全量生成；有效缓存会复用，不必重复付出请求额度。默认首次 398 段约需 27 分钟或更久，后续只处理缺失、修改或损坏的音频。

完整输出：

- `.audio-build/azure/assets/audio/`：MP3。
- `.audio-build/azure/data/audio-manifest.js`：版本 3、Azure Speech、Jenny、美式英语。
- `.audio-build/azure/data/audio-audit.json`、`report.json`：公开文本、生成配置、完整性结果。
- `.audio-build/azure/cache/`、`ledger.json`：本地复用和限流状态，不上传为网页资产。

现有 398 段英文实际文本共 5,547 字符；完整 SSML 长度的保守预算为 57,906 字符。该预算不是 Azure 余额，真实额度还要计入 Speech Studio 等其他使用。

## 下一步：准备网页音频替换

1. 确认当前全部片段均已生成且 `--verify` 成功；试听 Hello、Hi、数字、颜色、close、read、minute、th/t 示例、句子和作品介绍。
2. 只把暂存清单引用的新 MP3 复制到项目 `assets/audio/`。用暂存 Azure 清单及公开审核信息替换 `data/audio-manifest.js`、`data/audio-audit.json`，不要复制本地账本或环境文件。
3. 按每段真实 SSML 指纹检查新地址，完整切换后移除未引用旧 MP3；现有音频静态检查要求没有无引用的旧文件。
4. 更新 `index.html`、`audio-review.html` 等脚本缓存版本，避免平板沿用旧清单。播放器现有 `assets/audio/<20位哈希>.mp3` 路径可沿用。
5. 更新试听页的“英式英语”文字、README、`assets/audio/NOTICE.md` 及 `PRONUNCIATION_REVIEW.md`，准确说明 Azure Jenny、美式英语、默认风格和正常语速。旧 Kokoro 听感结论不能套用为 Azure 审听结论。
6. 调整当前仍固定在 Kokoro/v2 的测试：
   - `tests/audio.test.js`：版本、声线、语言、来源、kind/profile、文件名计算、缓存参数和来源说明；Azure 每段文件名由实际 SSML 指纹决定，不能用旧“profile + key”公式。
   - `tests/audio.browser.test.js`：版本、profile、新 MP3 路径及缓存参数断言；保留真实播放和记录保护检查。
   - `tests/audio-review.browser.test.js`：版本和页面说明；保留搜索、停止、失败提示及不写记录检查。
7. 再跑脚本与网页检查：

```sh
python3 tests/azure-audio.test.py
node tests/questions.test.js
node tests/record-backup.test.js
node tests/speech-text.test.js
node tests/audio.test.js --decode
node tests/audio-player.test.js
node tests/audio.browser.test.js
node tests/audio-review.browser.test.js
node tests/browser.test.js
node tests/backup.browser.test.js
```

检查手机／平板布局、没有系统语音时的 MP3 播放、连续点击、听辨题隐藏答案、停止／退后台、错题重练、首次正确率、刷新保存和备份恢复。人工听感、实际华为设备验证与程序通过分开记录。

上述工作完成后，把音频更新保存在开发分支供用户查看。不要直接把当前交接分支发布到正式站点；它目前仍含旧 Kokoro 录音。
