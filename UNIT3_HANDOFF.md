# Unit 3 开发版与音频接续

日期：2026-10-13。开发分支：`unit3-farm-learning`。基于最新 Azure 交接提交 `637ada427ed6fcacf120af60228a348847b81d6a`。本次只推送开发分支，不更新正式 Pages 来源 `learning-record-backup`、`learning-garden-windows` 或 `main`。

## 已实现

- `data/english-unit3.js`：7个独立知识点、140道原创固定题、45张双语学习卡、4篇原创动物宝宝短文及有限选项的农场介绍。没有复制教材故事、插图或音视频。
- 首页英语 Unit 3 进入按目标学习；可选5题/10题。原提示、重试、首次正确率、错题复习、刷新保存及导出/恢复流程适用于新题。
- 农场任务选择三种不同动物、1～3只及 small/big/happy，显示图示、句子和可切换的中文帮助。正确使用 sheep 单复数及 has/have。草稿不写入成绩，也不采集姓名。
- 新 Unit 3 只播放已生成 MP3。缺录音时禁用对应按钮、显示准备中提示；听辨题展示文字。即使设备提供系统朗读，也不将它当作用户已确认的 Jenny 录音。
- 原1602个题对象、旧词表、题号、记录键 `learning-garden-v1`、备份格式及398个实际 MP3 保留。
- 主程序、修改后的题库和样式使用新的缓存参数；同源升级回归同时核对新目标题库和历史记录，避免刷新继续加载旧题库。

## 新录音真实状态

当前运行环境没有已载入的 `SPEECH_KEY`；另一个任务验证 Azure 成功，不代表密钥在此环境可用。本次没有调用 Azure，没有生成103段新MP3，也没有创建虚假音频条目。旧 `data/audio-manifest.js` 和 `data/audio-audit.json` 保留，仍只描述已交付398段。

默认全量收集器 `node scripts/audio-texts.js` 包含 Unit 3 所有题目、答后示范、学习卡、短文及全部农场可选句子：**2,029个朗读入口，去重501段**。其中398段复用，**103段待生成**；保守新增SSML字符量 **15,547**。这是当前文本计划，不是题数、测试次数或 Azure 剩余额度。

`data/audio-pending.json` 记录这103段的实际文本、来源、SSML指纹和目标路径。测试独立重建完整计划，防止遗漏或将未生成录音宣称为完成。`--published-only` 只用于审核原398段的历史输入；正常 Azure 生成始终收集全部当前内容。

## 接续生成

1. 在 Codex 云环境的 **环境设置 → 密钥（Secrets）** 安全配置 `SPEECH_KEY`，设置非密钥变量 `SPEECH_REGION=eastus`，按界面应用环境配置及 `eastus.tts.speech.microsoft.com` 网络规则。可复用用户已验证任务的安全配置；不要把密钥放进聊天、文件、前端或日志。详细步骤见 [配置说明](AZURE_SPEECH_SETUP.md)。
2. 先运行只读计划：

   ```sh
   python3 scripts/build-azure-audio.py --dry-run
   ```

   预期 `totalClips=501`、`committedReusedClips=398`、`newRequests=103`。生成器现在会严格核验已提交的 Azure 配置、实际SSML指纹、SHA-256、字节数、时长及完整非静音解码，并复用这些文件；新克隆无需重新请求398段。dry-run不读取密钥、不写文件、不调用服务。
3. 密钥和网络生效后，运行 `python3 scripts/build-azure-audio.py`，再运行同一命令加 `--verify`。使用已确认 `en-US-JennyNeural`、默认风格、正常语速，F0串行4秒间隔、20次/60秒滚动窗口、持久限流及有限重试。只请求新或改变/损坏的片段；账本不会假称知道其他任务的服务用量。
4. 全部501段通过验证后，从 `.audio-build/azure/` 把清单引用的MP3、`data/audio-manifest.js`、`data/audio-audit.json` 复制到项目根目录；只保留新清单引用的音频，保存不含密钥的生成报告。不要提交缓存、账本或环境文件。
5. 删除已完成的 `data/audio-pending.json`，更新测试的交付基线及README状态，更新脚本缓存参数。保留所有题目ID、学习记录和本地存储键。严格音频测试须改为审核新501段全部来源，不能继续用原398段基线冒充完成。
6. 运行下方检查及关键句人工试听。验证 MP3 成功后，已有 Unit 3 播放按钮会按新清单启用。先保存供用户查看；发布正式网站需遵循当前用户授权。

## 本分支检查

```sh
node --test tests/questions.test.js tests/english.test.js tests/hello.test.js tests/unit1.test.js tests/unit2.test.js tests/unit3.test.js tests/speech-text.test.js tests/record-backup.test.js
node tests/unit3.browser.test.js
node tests/browser.test.js
node tests/backup.browser.test.js
node tests/audio.test.js --allow-pending --decode
node tests/audio-player.test.js
node tests/audio.browser.test.js
node tests/audio-review.browser.test.js
python3 tests/azure-audio.test.py
```

`--allow-pending` 是明确的开发审查模式：核验398段成品，同时精确核验103段待生成清单，不代表全量音频完成。不加这个参数的 `node tests/audio.test.js` 当前应失败；新的内容缺MP3必须被检测出来。

浏览器检查采用本地HTTP、390px手机和1024px平板，覆盖45张卡、7目标5/10题、两次错误、重复点击、错题重练、记录/备份/刷新、农场图示/编辑和无系统语音。经典脚本检查覆盖相对路径和无网络依赖。当前云 Chromium 管理策略阻止file://页面；尚未做Windows或华为实体设备验证。用户下载完整项目后可用Windows Edge双击HTML；云环境浏览器的URL策略不改变静态文件结构。

软件检查不能代替逐条人工发音审听。新增音频生成后应试听 has/hasn’t got问答、c/k/ck完整词、宝宝阅读和完整农场介绍，并在华为平板检查点击播放、切题停止及媒体音量。
