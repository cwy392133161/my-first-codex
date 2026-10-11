# 英语示范音频来源说明

本目录的 MP3 是为“学习小乐园”的单词、原创示例句、原创阅读和作品介绍离线合成的英语示范音频，不是教材原声录音。

发音修正版使用 Kokoro v1.0 全精度 ONNX 模型、英国英语声线 `bf_emma`、语速参数 `0.88`。文本通过 Misaki 0.9.4 的英式读音转换，使用 spaCy 3.8.16 与 `en_core_web_sm` 3.8.0；词典未覆盖的输入使用英式 eSpeak NG 后备转换。模型通过 ONNX Runtime 直接推理，按官方音素长度减一选择声线参数；kokoro-onnx 0.4.9 仅提供音频裁剪函数。成品为24 kHz单声道、96 kbps MP3，保留轻声的词首和词尾并增加留白。

本版398段音频覆盖1,517个朗读入口；修正34张学习卡中单词和例句粘连，统一同义词、缩写对照及分号列表的朗读边界，并明确 `close`（关闭）、`read`／`reads`（现在时）、`minute`（分钟）的语义读音。题目编号和学习记录未因此改变。

模型和声音参数仅用于开发环境生成文件，没有随网页交付。网页通过普通浏览器音频功能播放本站 MP3，运行时不调用模型、外部语音接口或外部 AI 接口，也不发送孩子的学习记录、姓名或家庭资料。

`data/audio-audit.json` 保存每段的朗读文本、音素、来源、模型哈希及生成配置。全部音素可映射到模型、MP3完整解码和浏览器实际播放属于程序检查；**这些检查不代表全部录音已经由老师逐条听审，也不证明重音和语调始终自然**。家长可通过 `audio-review.html` 试听练习使用的同一套音频。本项目没有完成华为实体平板验证。

## 模型与工具归属

- **Kokoro / Kokoro-82M，hexgrad**：官方项目介绍说明模型权重采用 Apache License 2.0。本目录保留官方 Kokoro 仓库提供的许可证全文：[LICENSE-Kokoro](LICENSE-Kokoro)。
  - 官方代码及模型介绍：<https://github.com/hexgrad/kokoro>
  - 已核对的介绍原文：<https://raw.githubusercontent.com/hexgrad/kokoro/main/README.md>
  - 许可证原文：<https://raw.githubusercontent.com/hexgrad/kokoro/main/LICENSE>
  - 官方模型页面：<https://huggingface.co/hexgrad/Kokoro-82M>
- **kokoro-onnx，thewh1teagle**：官方 README 将工具标为 MIT，将 Kokoro 模型标为 Apache 2.0。本目录保留该工具的 MIT 许可证全文与原版权声明：[LICENSE-kokoro-onnx](LICENSE-kokoro-onnx)。
  - 官方项目：<https://github.com/thewh1teagle/kokoro-onnx>
  - 已核对的介绍原文：<https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/README.md>
  - 许可证原文：<https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/LICENSE>
  - 使用的模型及声音参数发布版本：<https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1>
- **Misaki，hexgrad**：Kokoro 配套的文字到音素工具；使用版本0.9.4，英式模式。本目录保留官方 Apache License 2.0 全文：[LICENSE-Misaki](LICENSE-Misaki)。
  - 官方项目与使用说明：<https://github.com/hexgrad/misaki>
  - 英语音素说明：<https://github.com/hexgrad/misaki/blob/main/EN_PHONES.md>
  - 许可证原文（通过 HTTPS 验证获取并原样保存）：<https://raw.githubusercontent.com/hexgrad/misaki/main/LICENSE>
- **spaCy 与英文语言模型，Explosion**：仅在开发环境用于文字分析，没有随网页交付模型或工具。
  - 官方项目：<https://github.com/explosion/spaCy>
  - 英文模型说明：<https://spacy.io/models/en#en_core_web_sm>
  - 本次使用的英文模型版本：<https://github.com/explosion/spacy-models/releases/tag/en_core_web_sm-3.8.0>

## 本次模型文件与生成版本

从以上官方 `model-files-v1.1` 发布获取以下文件，通过正常 HTTPS 验证下载，并在使用前核对 SHA-256：

| 文件 | 官方下载地址 | SHA-256 |
|---|---|---|
| `kokoro-v1.0.onnx`（全精度） | <https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx> | `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a` |
| `voices-v1.0.bin` | <https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin> | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

生成配置的指纹组成 `uk-misaki-v1-<12位指纹>` 版本，音频文件地址由该版本和朗读文本一起生成。模型、声线、语速、文本规则或音素序列变化后会生成新地址，避免继续使用旧录音缓存。它是生成过程的版本标记，不是人工发音审核评级。

## 许可资料范围

上面记录的是已核实的官方项目级许可声明。可获取的官方仓库资料没有列出 `bf_emma` 的独立许可；本环境无法访问官方 Hugging Face 声线说明页面 <https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md>，因此没有对该声线训练数据来源、现实人物身份或其他未列出的授权作额外断言，也没有将 Apache 或 MIT 许可解释为第三方对本项目的认可。

许可证全文按上游原样保存。音频文本及生成过程由本项目组织；合成语音供练习听读参考。
