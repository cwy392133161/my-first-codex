# 英语示范音频来源说明

当前 MP3 由 **Azure Speech** 通过 HTTPS REST 接口在开发环境预先合成，使用 **`en-US-JennyNeural`**、美式英语（`en-US`）、默认风格、正常语速。成品输出格式为 `audio-24khz-96kbitrate-mono-mp3`：24 kHz、单声道、96 kbps MP3。

这些录音用于“学习小乐园”的单词、原创示例句、原创阅读和作品介绍，不是教材原声。本发布 613 段音频复用覆盖 3,207 个朗读来源，保留原 501 段并仅新增 Unit 4 缺少的 112 段，数量不是题库题数。最初 119 条缺口中，1 条是展示双引号伪片段，另 6 条去除展示引号后复用已有词句；未为这些内容重复请求 Azure。`close`（关闭）、`read`／`reads`（现在时）、`minute`／`minutes`（分钟）在实际 SSML 中明确指定对应 IPA 读音；单词和例句、foot 和 feet 分段示范。Unit 3 包括 has／hasn’t got 问答、c／k／ck完整示例词、动物宝宝短文及农场介绍；Unit 4 包括喜好、礼貌请求／邀请、a 的完整示例词、原创食谱、野餐故事及可编辑野餐对话；原 501 段 MP3 地址、文件字节及 SSML 指纹保留，增量生成避免重复请求。

网站通过浏览器播放项目内 MP3，运行时不调用 Azure 或其他外部语音接口，不读取生成密钥，也不发送孩子的学习记录、姓名或家庭资料。密钥仅用于开发环境的 HTTPS 请求，没有随网页交付。

`data/audio-audit.json` 记录实际朗读文本、来源、生成配置、每段 SSML 指纹，以及完整解码接受文件的 SHA-256、大小和时长。音频清单版本为 3，配置标记为 `azure-jenny-v1-<12位指纹>`；每段文件名取实际 SSML、输出格式和生成规则指纹的前20位。文本、标点或读音规则改变会使用新文件地址；新增题目不使无关录音重新生成。

文件 SHA-256、完整解码、非静音和浏览器播放检查用于验证文件与软件流程，**不代表所有录音已由老师逐条完成人工发音审核，也不能证明发音、重音和语调始终准确自然**。本发布采用用户已试听确认的Unit 4候选，发布来源和回退记录见 [UNIT4_RELEASE.md](../../UNIT4_RELEASE.md)。可打开 `audio-review.html` 试听相同 MP3；本次检查结果见 [UNIT4_AUDIO_CHECKS.md](../../UNIT4_AUDIO_CHECKS.md)；此前398段检查记录见 [PRONUNCIATION_REVIEW.md](../../PRONUNCIATION_REVIEW.md)。本项目未完成华为实体平板或 iPhone 6 Plus／iOS 12 实机音频验收。

## 服务参考与历史文件

- Azure Speech 服务及声音由 Microsoft 提供：[文字转语音](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech)、[语言与声音](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)、[REST 输出格式](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)。使用受该资源适用的 Microsoft 服务条款约束；本项目没有将旧开源模型许可证套用到 Azure 服务或声线。
- 项目文本和生成流程由本项目组织，合成语音供练习听读参考，不表示 Microsoft 对本项目的认可。
- `LICENSE-Kokoro`、`LICENSE-kokoro-onnx`、`LICENSE-Misaki` 保留了历史离线音频工具的上游许可。当前 Azure Jenny 音频不使用 Kokoro、Misaki、spaCy 或 eSpeak 模型生成，以上文件用于历史追溯。
