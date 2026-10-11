# 英语示范音频来源说明

本目录的 MP3 是为“学习小乐园”的单词、原创示例句、原创阅读和作品介绍离线合成的英语示范音频，不是教材原声录音。

生成时使用 Kokoro v1.0 模型，通过 kokoro-onnx 运行，选择英国英语声线 `bf_emma` 和语言 `en-gb`。模型和声音参数仅用于开发环境生成文件，没有随网页交付。网页通过普通浏览器音频功能播放本站 MP3，运行时不调用模型、外部语音接口或外部 AI 接口，也不发送孩子的学习记录、姓名或家庭资料。

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

## 许可资料范围

上面记录的是已核实的官方项目级许可声明。可获取的官方仓库资料没有列出 `bf_emma` 的独立许可；本环境无法访问官方 Hugging Face 声线说明页面 <https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md>，因此没有对该声线训练数据来源、现实人物身份或其他未列出的授权作额外断言，也没有将 Apache 或 MIT 许可解释为第三方对本项目的认可。

许可证全文按上游原样保存。音频文本及生成过程由本项目组织；合成语音供练习听读参考。
