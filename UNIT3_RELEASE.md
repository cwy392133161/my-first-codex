# Unit 3 正式发布记录

日期：2026-10-14。用户已试听满意并授权将 `unit3-farm-learning` 的 `e86bb78c85c84a9650b3baf518a65aa3c6d265f5` 发布到现有网站。本发布以该提交为父提交；网站运行文件及音频保持其已验收内容，只更新发布说明。

## 实际发布来源与网址

- GitHub Pages实际来源为 `learning-record-backup` 根目录，沿用当前设置。
- 发布前版本为 `0f4032c529f411defcb111cad995192362d0fa6c`。最近成功的Pages运行为 [38320838270](https://github.com/cwy392133161/my-first-codex/actions/runs/38320838270)，build日志checkout该分支，deploy日志记录该提交及原网址；Git远端分支也指向同一提交。当前连接不能读取Pages管理设置API，因此发布来源通过实际构建、部署日志和远端引用核对。
- 已在GitHub保存回退分支 [`rollback-before-unit3-20261014`](https://github.com/cwy392133161/my-first-codex/tree/rollback-before-unit3-20261014)，精确指向发布前版本。
- 原网址：<https://cwy392133161.github.io/my-first-codex/>
- 家长试听页：<https://cwy392133161.github.io/my-first-codex/audio-review.html>
- 不修改域名、网址、Pages来源、`main` 或 `learning-garden-windows`；原独立 `pronunciation-preview/` 目录保持不变。

部署结果以本发布提交对应的Pages build、deploy和report任务成功为准；生成阶段的交接文档与 `data/unit3-audio-build-report.json` 中“未发布”字段属于当时的历史快照。

## 内容、音频与保留数据

Unit 3包含7个学习目标、140道原创固定题、45张双语学习卡、4篇动物宝宝短文和可编辑的小农场任务。保留原1602道完整题目及ID，题库总计1742道。原 `learning-garden-v1` 存储键、首次结果、学习记录、错题及备份协议保留，发布无需清除浏览器数据。

音频为Azure Speech `en-US-JennyNeural`，默认风格、正常语速、24 kHz单声道96 kbps MP3。已有398段文件、路径和字节保持不变，只加入已生成的103段，共501段、2029个朗读入口。此发布不调用Azure、不生成录音、不读取或交付密钥。

音频脚本缓存参数为 `azure-jenny-unit3-v1-20261013`；课程脚本、Unit3内容、题库及样式参数为 `unit3-farm-audio-v2-20261013`。同源刷新加载新清单，旧MP3继续使用原地址与缓存。备份数据保存在使用者的浏览器，发布脚本不读取或删除它们。

## 检查与限制

已验收版本的检查见 [UNIT3_AUDIO_CHECKS.md](UNIT3_AUDIO_CHECKS.md)：501段映射、SSML指纹、文件哈希、完整非静音解码及浏览器媒体检查；14组主站音频、6组试听页、11组Unit3、14组备份及基础浏览器检查。新增代表内容以正常1倍速播放，覆盖问答、c/k/ck整词、四篇宝宝短文及完整农场。全量501段自动媒体检查采用4倍速静音、8通道并行，不能当作逐条人工听审。

发布前另完成实际旧生产版0f4032c到本次版本的6组同源浏览器升级检查：原记录、错题及无关设置保留，旧版真实导出备份在新版恢复，旧Hello继续命中HTTP缓存，新Unit3入口及音频启用，首次成绩和重复导入／刷新保存正确。静态核对原1602道完整题目、398段MP3、备份代码和独立试听目录不变。发布后检查对应Pages任务和实际部署产物的Unit3运行文件、501段MP3、清单和缓存参数。

当前绑定环境的有效自定义网络允许名单仍仅含 `eastus.tts.speech.microsoft.com`；正式域名 `cwy392133161.github.io` 不在其中。发布前对首页、试听页和清单的HTTPS请求均被环境代理以CONNECT 403拒绝。若发布后仍拒绝，直接线上HTTP、入口交互、缓存响应及线上播放不能标记通过；GitHub部署产物核对与本地同源浏览器检查须与直接线上验收分开报告。

程序验收不等于全部发音已逐条人工确认。未完成华为实体设备验收。

## 回退方法

需要回退时，在 `learning-record-backup` 上以回退分支完整文件树创建新的回退提交并推送，保留发布历史，避免强制改写分支。回退恢复网站内容和音频，不读取、清空或覆盖浏览器学习记录。
