# Azure 英语音频生成：配置和使用

本项目使用你已确认的 `en-US-JennyNeural`，默认风格、正常语速，在开发环境提前生成 MP3。孩子打开网站时只播放这些文件，不访问 Azure，不读取密钥。

当前开发分支是 `azure-speech-audio`。这次只新增生成工具；正式网页、原题号、首次作答记录、错题、备份格式和 `learning-garden-v1` 本地存储键保持原样。尚未生成真实 Azure 录音，也没有更新网站。

## 在哪里安全填写密钥

1. 在 Azure 门户打开你创建的 Speech 资源，进入“密钥和终结点”，复制“密钥 1”或“密钥 2”。
2. 回到当前 Codex 云环境的**环境设置**，找到**密钥（Secrets）**，在 `SPEECH_KEY` 的安全输入栏填写。不要在聊天里发送密钥。
3. 在环境变量中确认 `SPEECH_REGION` 为 `eastus`。这不是密钥，可以直接填写。
4. 审阅并保存配置，再按界面要求**发布/应用云环境配置**，让密钥与网络规则进入运行环境。这一步是应用云环境配置；学习网站仍保持原版。

已保存的配置草稿声明 `SPEECH_KEY` 只用于 `eastus.tts.speech.microsoft.com`，并增加该目标域名的网络许可。草稿没有密钥值；保存草稿也不等于运行环境已经配置成功。当前环境的旧网络规则会拒绝这个 Azure 目标，需要应用上述配置后再检查。

配置好后，可以在聊天里只说“密钥已安全配置”，无需附上任何密钥或截图。助手将仅检查配置是否存在，再生成 Hello、Hi 两段真实样本。

## 生成步骤（助手或开发者操作）

需要 Python 3、Node 和 FFmpeg。生成器只使用 Python 标准库，无需安装 Azure SDK，也不需要旧 Kokoro 模型。

在项目目录先检查计划：

```sh
python3 scripts/build-azure-audio.py --dry-run
```

此命令不读取密钥、不发送 Azure 请求、不改文件。当前结果：1,517 个朗读入口复用为 **398 段**；实际英文文本共 **5,547 字符**。按完整 SSML 长度保守估算为 **57,906 字符**，这只是生成器的预算上界，不是 Azure 的实际账单或剩余额度。

配置生效后，先生成并验证 Hello、Hi 样本：

```sh
python3 scripts/build-azure-audio.py --limit 2
```

再完整生成：

```sh
python3 scripts/build-azure-audio.py
```

已有有效音频会复用；首次生成的两段也不会再请求一次。按默认每 4 秒启动一个请求，首轮 398 段至少约 27 分钟，网络延迟、退避和重试可能使时间更长。再次运行可续跑。

生成完成后进行只读验证：

```sh
python3 scripts/build-azure-audio.py --verify
```

验证模式不会调用 Azure。缺文件、文件哈希异常、损坏或静音都会报告失败。MP3 解码检查证明文件完整及含有声音；仍需要听 Hello、Hi、close、read、minute 等关键示范，不把程序检查当作逐条人工发音审核。

## 输出、复用和网站更新

所有输出位于未跟踪的 `.audio-build/azure/`：

- `assets/audio/`：MP3；每段根据实际 SSML、输出格式和生成规则生成独立指纹。
- `cache/`：该音频的完整指纹、文件 SHA-256、大小及解码时长，供后续验证和复用。
- `ledger.json`：本地请求时间、冷却期限和保守字符用量，没有密钥。
- `data/audio-manifest.js`：全部当前音频验证成功后才写入的网页清单。
- `data/audio-audit.json`、`report.json`：公开文本及生成、验证结果，没有密钥或学习记录。

相同文本共用一个文件。增加题目不会改变其他音频文件名；即使朗读索引相同，实际文本或标点变化也会得到新文件。缓存必须同时通过指纹、文件哈希和完整解码检查，才会复用。

样本生成、失败或中断不会替换已有的完整清单；已验证的音频和限流进度会保留。生成器不覆盖项目根目录中的 `assets/audio/`、`data/audio-manifest.js` 或发布分支。

全库生成、验证及关键样本试听完成后，助手才准备把**新清单引用的文件**及清单用于网站，并更新美式 Jenny 发音说明、脚本缓存版本和相关测试。此时仍可审阅更新；本阶段不发布学习网站。

## F0 限流和异常处理

Microsoft 官方限制：F0 实时 TTS 每 60 秒最多 **20 次事务**，F0 不支持批量合成接口。脚本使用实时 REST 接口串行生成，默认间隔 **4 秒**，同时保留 60 秒滚动窗口；重启和重试都继续受限流记录约束。一个生成目录只能有一个生成进程。

429 和临时 5xx／网络超时会有限重试，默认最多 4 次。响应若有 `Retry-After` 就遵守，否则指数退避；服务器要求等待超过本次上限时，保存冷却期限并退出，稍后续跑，不提前重试。401／403 等认证或额度问题立即停止。

本地默认每个 UTC 月的保守字符预算上限是 500,000，可用 `--budget` 设更小的值；它不知道 Speech Studio 或其他程序已经使用的额度，也不是 Azure 剩余免费额度查询。请以资源当前 F0 额度为准。失败或超时也预记本地预算，避免重复请求低估可能的消耗。网站播放已生成 MP3 不产生新的语音合成请求。

密钥仅从安全环境变量读取，代码不接受 `--key` 或密钥文件参数。不写请求头、服务返回正文或原始异常到日志，也不把密钥传给收集文本和解码音频的子进程。接口重定向会被拒绝，避免向其他地址转发密钥。

## 开发检查

```sh
python3 tests/azure-audio.test.py
node tests/questions.test.js
node tests/record-backup.test.js
node tests/speech-text.test.js
```

Azure 脚本测试使用本地真实 MP3 和模拟请求，覆盖复用、增量、F0 限流、重试、失败续跑、密钥保护和暂存输出，不使用真实密钥、不消耗 Azure 额度。模拟测试通过不等于真实 Azure 合成已经成功。

官方参考：[配额](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits#real-time-text-to-speech)、[REST／MP3 格式](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)、[SSML 默认风格](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#styles-and-roles-in-neural-voices)、[计费字符](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters)。
