# Azure 音频最新代码：接续说明

交接日期：2026-10-13（北京时间）。交接分支：`azure-speech-handoff-20261013`。

**后续开发：** `unit3-farm-learning` 已加入 Unit 3 目标课程，并完成本文第3节所述的已提交音频缓存复用改进。该分支仍有103段新录音待生成；最新状态和接续步骤以 [UNIT3_HANDOFF.md](UNIT3_HANDOFF.md) 为准。下文保留原交接快照的历史状态。

## 当前实际进度

本次开始时，当前工作区位于旧交接提交 `d070b76a413300a3d4124428ddf77c30d56e7805`，没有未提交修改。核对远端后发现，另一个任务已完成 Azure 音频生成、替换，并将代码提交到 `learning-record-backup`：`0f4032c529f411defcb111cad995192362d0fa6c`。

因此本次新快照以这份最新远端代码为基础，包含全部网页代码、题库、398 段 Azure MP3、生成器及测试。旧交接分支仍保留。本次只保存开发快照，不推送正式发布分支、不再次部署、不回退其他任务的更新。

- `data/audio-manifest.js` 已是 v3：Azure Speech、`en-US-JennyNeural`、`en-US`、默认风格、正常语速、24 kHz 单声道 96 kbps MP3。
- 398 段 MP3 都已在 `assets/audio/` 中，清单引用文件完整；公开 SHA-256、字节数和时长在 `data/audio-audit.json`。
- 生成记录见 `data/azure-build-report.json`，已有检查记录见 [AZURE_AUDIO_CHECKS.md](AZURE_AUDIO_CHECKS.md)。这些是此前任务的结果，不是本次重复合成或重跑全部测试。
- 另一个任务的发布提交及回退信息见 [AZURE_RELEASE.md](AZURE_RELEASE.md)。记录说明用户曾试听满意并授权该次发布，但不代表全库逐条人工发音验收。
- 本工作区没有 `.audio-build/azure/`，不包含原任务的本地缓存、限流账本、密钥或运行环境。已提交 MP3 的播放及静态检查不需要密钥。

## 新任务先做什么

先检出本交接分支，确认已有音频和审核数据，不要把旧交接文档中的“仍待生成398段”当作最新状态，也不要重复请求整库。

### 1. 核对线上部署与华为设备

- 查看 `learning-record-backup` 最新版本对应的 GitHub Pages build/deploy 状态，并核对正式网址实际加载的 v3 清单和 `azure-jenny-v3-20261012` 缓存版本。
- 当前任务未直接核验线上网页响应。后续按运行环境的网络规则进行验证，不绕过代理或证书检查。
- 在华为平板实际检查 Hello、Hi、连续播放、切题、退后台、无系统语音时的 MP3 播放和失败提示。实体设备验证仍待完成。
- 不清空浏览器数据。核对原首次记录、错题、刷新保存及导出恢复继续保留。

### 2. 完成实际发音核对

旧任务记录了软件检查和部分试听，但没有逐条人工审听全部398段。继续听数字、颜色、close/read/minute、th/t 示例、完整句子和作品介绍；具体发现哪段不对，再调整该段文本或 SSML 并更新音频。

语音资源固定为 `eastus`、F0、`en-US-JennyNeural`、默认风格、正常语速。不要因旧 Kokoro 的听感问题而重新更换这套已选声线。

### 3. 补齐新环境的增量缓存复用

当前生成器 `scripts/build-azure-audio.py` 的复用依赖 `.audio-build/azure/assets/audio/` 和 `cache/`，这些本地文件被忽略，不在 GitHub 克隆中。当前已有 MP3 全部已提交，但直接在没有缓存的新环境运行生成命令，会把它们当作缺缓存并重新请求。

后续应先安全复用原任务的非密钥缓存，或实现从仓库已提交的 `assets/audio/` 和 `data/audio-audit.json` 导入缓存：核对配置、真实 SSML 指纹、SHA-256、字节数、完整解码及非静音，匹配后建立本地缓存；不要伪造 Azure 用量账本或假称知道服务余额。

验证缓存复用后，再执行增量流程：

```sh
python3 scripts/build-azure-audio.py --dry-run
python3 scripts/build-azure-audio.py
python3 scripts/build-azure-audio.py --verify
```

只有新增、实际文本／标点／读音规则修改或文件损坏的片段应产生新请求。需要新增合成时复用用户已验证任务的安全配置，密钥只由 `SPEECH_KEY` 读取，区域为 `SPEECH_REGION=eastus`；不要向聊天索取密钥。

## 以后准备局部音频更新

1. 修改对应朗读文本或读音规则，保留题目ID和含义；生成并验证变更音频。
2. 仅复制新清单引用的MP3和公开审核信息到网页，移除未引用文件；不提交本地账本、缓存或环境文件。
3. 更新脚本缓存版本与说明，保持准确的美式 Jenny 声线标识。
4. 跑静态、真实播放及数据兼容检查：

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

程序播放通过、人工听感与华为实机结果分别记录。检查完成后先保存到开发分支供用户查看，当前要求暂不更新正式网站。

## 安全与数据约束

- 密钥不进入前端、文件指纹、仓库、日志或原始错误正文；不把密钥传给文本收集、解码等子进程。
- `.env*`、`.audio-build/`、Python缓存保持忽略，不使用 `git add -f` 上传。
- Azure生成沿用F0串行4秒间隔、20次／60秒滚动限制、持久冷却期限和有限重试；重试计入额度。
- 保留所有题目ID、首次结果、学习记录、错题、备份协议和 `learning-garden-v1`。
- 网站只播放静态MP3，不调用Azure，不上传孩子的学习记录。
