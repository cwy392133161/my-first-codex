# Unit 4：Food with friends 开发交接

开发分支：`unit4-food-learning`，从已发布的 `66dae81` 创建。此分支增加第 4 单元学习目标与 3～4 单元复习，**尚未更新正式网站**，不修改 GitHub Pages 配置。

## 新手查看

打开 [开发分支](https://github.com/cwy392133161/my-first-codex/tree/unit4-food-learning)，点击绿色 **Code → Download ZIP**。Windows 下载后右键选择 **全部提取**，打开解压后的项目文件夹，双击 `index.html`。请保留同文件夹中的 `data`、`assets`、脚本与样式文件。无需安装依赖。

首页进入 **英语学习 → Unit 4 → 按学习目标学 Unit 4**；综合复习使用 **3～4 单元综合复习**入口。每个目标可单独练习 5 或 10 题。虚拟野餐制作和练说不计答题成绩，草稿刷新后重新制作。

## 内容与数据

题目、短文、食谱及任务对话为本项目原创示例，根据提供图片的学习目标设计，未复制教材故事、歌曲、插图或音视频，不宣称覆盖整套教材。

重点词共 19 个。`chicken` 在本单元指鸡肉，`orange` 指橙子；保留原来 33 个 Unit 4 词条及双向词汇题。字母 a 比较 /æ/ 与 /eɪ/，`salad` 只分析第一个 a；示范读完整单词，不把字母名当作音素。

喜好练习使用明确的虚构人物设定。请求与邀请区分说话角色；接受和婉拒均为合理选择。食谱通过已准备好的水果和简单步骤学习顺序。野餐可选三种不同食物、一种饮料，练习礼貌邀请和回应，不采集真实个人资料。

所有原有 1742 个题对象及题号保持不变（其中包括数学动态生成的组合）；新增固定题使用独立编号。`learning-garden-v1` 记录键、首次作答、错题、JSON 备份及 iOS 12 文字备份协议保留，**无需清空记录**。旧版程序不认识新增题号，因此有新增记录的备份应在此版或更新版本恢复。

本次追加 **191 道固定题、54 张卡**：Unit 4 七个目标 167 题／50 卡，3～4 复习 24 题／4 卡。全部题目可参与原有错题与备份流程。

## 音频待完成

保留全部现有 501 段 Azure Jenny MP3、公开音频清单与审核文件。相同单词和句子继续复用；新增文本尚未合成。新目标与综合复习只播放已准备的 MP3，缺少任一句时显示文字提示，不改用设备声线。单词已有录音时仍能点击播放。

完整去重计划共 **620 段**，其中复用现有 **501 段**，待生成 **119 段**；全部当前朗读来源共 3,207 个，不等于题目数量。

`data/audio-pending.json` 是准确的待生成计划，**不是音频成品清单**。`scripts/plan-azure-audio.py` 只核对文本、SSML 指纹及已有文件，不读取密钥、不调用 Azure。修改内容后先更新计划，再生成新音频。

后续任务：

1. 在云环境的 **环境设置 → 密钥（Secrets）** 安全配置 `SPEECH_KEY`；非密钥变量设 `SPEECH_REGION=eastus`，允许 `eastus.tts.speech.microsoft.com`。不要把密钥发在聊天、写进项目或日志。详见 [Azure 安全配置](AZURE_SPEECH_SETUP.md)。本次环境未配置密钥，因此未请求 Azure。
2. 运行 `python3 scripts/plan-azure-audio.py --check`，再运行 `python3 scripts/build-azure-audio.py --dry-run`。确认复用 501 段，只请求新增或变化内容。
3. 运行 `python3 scripts/build-azure-audio.py`，然后加 `--verify` 验证。保持 `en-US-JennyNeural`、默认风格、正常语速；现有 F0 串行、4 秒间隔、20 次／60 秒滚动窗口及有限重试规则不变。输出位于忽略目录 `.audio-build/azure/`，不自动发布。
4. 验证后把暂存目录清单引用的 MP3、`data/audio-manifest.js` 与 `data/audio-audit.json` 一起交付；保留原 501 段地址和文件。完整交付后移除待生成清单，更新审核测试与缓存参数。不要提交环境文件、生成缓存或限流账本。
5. 运行严格全量音频检查并人工试听喜好、礼貌请求、a 的完整例词、食谱、故事及完整野餐对话，再准备网站更新。

## 验证方式

```sh
node tests/unit4.test.js
node tests/unit4.browser.test.js
node tests/ios12.test.js
node tests/ios12.browser.test.js
node tests/audio.test.js --allow-pending
node tests/speech-text.test.js
python3 scripts/plan-azure-audio.py --check
python3 tests/azure-audio.test.py
```

`--allow-pending` 仅核验已交付音频及准确的缺失计划；不代表全量音频完成。当前不加参数的 `node tests/audio.test.js` 应因新增 MP3 缺失而失败，完成生成与交付后必须让严格模式通过。

浏览器自动化使用 Chromium；414×736 和 736×414 布局、缺失 API 的降级检查不能替代 iPhone 6 Plus／iOS 12 实机验证。当前环境不能提供可点击的网页预览，使用上述完整 ZIP 在本地查看；正式网站保持现有版本，发布需按用户的下一步指示操作。

本次已通过新单元数据检查和 6 组浏览器流程：全部 54 张卡、各目标 5 题、喜好／食谱／复习 10 题、两次反馈与重复点击、错题重练、刷新保留、JSON 及文字备份恢复、野餐编辑与谢绝、已有 MP3 实际播放及缺音频降级。414×736、736×414、390px 手机和 1024px 平板页面均未横向溢出。

原有题库／备份 7 套 Node 检查串行通过；24 个前端脚本的 ES2019／旧 API 检查、1742 个旧题完整对象、501 段 MP3 SHA-256 和原备份协议校验通过。首次并行旧测试曾因资源竞争触发 1 秒 VM 超时，未修改超时或断言，串行重跑通过。Azure 生成器 33 项离线回归、8 项朗读规范检查、4 项播放器检查和明确的待生成音频审查通过；没有请求 Azure。

原有 iOS 12 降级、Unit 3（11 组）、音频流程（14 组）及备份（14 组）浏览器回归均成功退出。生成器 `--dry-run` 已实际运行，输出 `totalClips=620`、`committedReusedClips=501`、`newRequests=119`、`complete=false`；未使用密钥、未合成或替换录音。
