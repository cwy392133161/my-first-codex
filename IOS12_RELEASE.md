# iPhone 主屏幕版与 iOS 12 兼容发布

日期：2026-10-14（北京时间）。用户已授权先备份当前线上版本，再将 `ce94d5cb4bc13553edc581108be58418db8a9a2c` 同步到实际发布分支 `learning-record-backup`；保留分支更新，不强制覆盖。

## 先备份，再合并

发布前重新读取远端：`learning-record-backup` 为 `b635fe06715c9d2f4d775c33646a8ae4ca89b2de`，与最近成功的公开Pages运行 [38488738173](https://github.com/cwy392133161/my-first-codex/actions/runs/38488738173) 一致。该运行显示分支、提交、Status Success和原部署网址。

已先创建并推送回退分支 [rollback-before-ios12-webapp-20261014](https://github.com/cwy392133161/my-first-codex/tree/rollback-before-ios12-webapp-20261014)，远端精确指向 `b635fe0`，包含原网站全部代码、题库和501段录音。备份不会读取孩子浏览器中的记录。

本次将最新发布分支作为合并父提交，合入 `ce94d5c`，保留双方Git历史；只更新发布说明，不再改已测试的运行代码。此次读取未发现发布分支另有新增提交。推送使用普通Git push，无force参数；若推送期间出现并行更新，须重新获取并合并，不能强推。

- 实际Pages来源继续为 `learning-record-backup` 根目录；不修改配置。
- 原网址继续为 <https://cwy392133161.github.io/my-first-codex/>。
- 家长试听继续为 <https://cwy392133161.github.io/my-first-codex/audio-review.html>。
- 本轮不更新`main`、域名或用户浏览器数据；`learning-garden-windows` 保留此前已交付的兼容版本。

## 题库、声音和记录不变

相对发布前 `b635fe0`，全部题库文件、1742个完整题对象及ID、501段MP3的路径和字节、音频清单、审核数据及 `record-backup.js` 保持不变。Git内容证据：

| 保留内容 | 发布前与合并候选的相同Git对象 |
|---|---|
| `data/` 文件树 | `0e04ca881598f7fac0e90541142facfe12b60b51` |
| `assets/audio/` 文件树 | `90d6e8d19d6621c83a327c66cb060ef61a6e415f` |
| `record-backup.js` 文件 | `4cdd0e668957ed779490246a99e2d7e2428da036` |

语音继续为Azure Speech `en-US-JennyNeural`、默认风格、正常语速。没有重新生成音频、读取密钥或调用Azure。

网页保留 `learning-garden-v1`、首次答题统计、错题及备份格式。发布不触发清空或迁移；清空仍必须经过用户二次确认。iOS 12 的FileReader／备份文字恢复复用原合并规则，现代浏览器文件备份功能继续保留。

Safari与主屏幕Web App可能分别管理存储；这不是题号或存储键变化。安装前保存备份，主屏幕记录为空时恢复，见 [安装说明](IOS12_WEBAPP.md)。

## 修复内容与已有检查

运行文件与已验收的 `ce94d5c` 一致：Apple全屏元数据、default状态栏、180px图标、横竖屏viewport、旧Safari语法／API和CSS fallback、确认弹层与文字备份。修改后的脚本／样式缓存参数为 `ios12-webapp-v1-20261014`，未改变501段MP3地址及数据清单参数。

发布候选复核通过23个实际前端脚本的ES2019语法、Apple元数据／图标／子目录路径、全部1742题和501个文件SHA-256、原备份协议。上一阶段已通过两方向iOS12缺失API／CSS模拟、1000条记录文字备份、14组备份、14组实际MP3播放、6组试听页和完整非静音解码。此次无运行代码变化，复用这些有效结果，不把未重跑的全套检查描述为重新验收。

## 部署核验与限制

推送后须核对新提交对应的 **pages build and deployment**，确认分支、完整提交SHA、build／deploy成功和原网址。GitHub公开运行页面可以读取这些信息；本环境未登录的公开artifact与日志页面可能不可读，不能把源代码检查冒充部署产物检查。

当前云网络未允许 `cwy392133161.github.io` 和 `api.github.com`。直接线上首页、资源和播放请求若仍被代理CONNECT 403拒绝，须明确报告未能进行直接线上验收，不绕过代理或TLS检查。配置草稿此前因stale_base未保存成功，未改变有效网络策略。

没有iPhone 6 Plus／iOS12实机或旧Safari环境；本地模拟与部署成功不能证明真实浏览器栏隐藏或实体设备发音播放。安装后从主屏幕图标进入，地址栏和底部Safari工具栏应隐藏，顶部iOS系统状态栏保留。无需清空网站数据。

## 回退

需要回退时，在 `learning-record-backup` 上以回退分支的完整文件树创建新恢复提交并普通推送，保留历史。不要强制重置远端。回退网站内容不读取、清空或恢复孩子的浏览器学习记录。
