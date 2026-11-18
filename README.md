# 国网刷题 · iOS 云端打包（免费出 IPA）

这个仓库只有一个目的：用 **GitHub Actions 的免费 macOS 机器** 把 Xcode 工程编译成 **未签名 IPA**。
拿到 IPA 后，你用 Sideloadly / 爱思助手 / AltStore 自己签名安装即可（就是你说的「我自己签名」）。

> 为什么不在本地做：IPA 必须由 macOS + Xcode 把源码编译成 iOS 二进制再打包，Windows/Linux 做不了。这里用云端 macOS 代替。

---

## 用法（网页点几下就行，约 5 分钟）

1. 登录 GitHub，右上角 `+` → **New repository**
   - Repository name 随意，例如 `guowang-quiz-ios`
   - 选 **Private** 或 Public 都可以，**不要**勾选 "Add a README file"
   - 点 **Create repository**

2. 上传代码（两种方式任选）

   **方式 A：拖拽上传（推荐）**
   - 在仓库首页点 `uploading an existing file`
   - 把本文件夹里的 `GuowangQuiz`、`GuowangQuiz.xcodeproj`、`project.yml` 拖进浏览器
   - 点 **Commit changes**

   **方式 B：保证 `.github` 目录一定传上去**
   - 网页上传时隐藏目录（以 `.` 开头）有时会被忽略，所以工作流文件建议手动创建：
   - 仓库首页 → **Add file** → **Create new file** → 文件名填
     `.github/workflows/build-ipa.yml`
   - 把本文件夹里 `.github/workflows/build-ipa.yml` 的内容整段粘贴进去 → **Commit changes**

3. 打开仓库的 **Actions** 标签页
   - 会看到一次名为 `Build IPA` 的运行（push 触发，自动开始）
   - 如果没自动跑：点 `Build IPA` → **Run workflow** → 选 `main` → Run

4. 等 3～5 分钟，运行变绿 ✅

5. 点进这次运行，页面底部 **Artifacts** → 下载 `GuowangQuiz-unsigned-ipa.zip`
   - 解压得到 `GuowangQuiz-unsigned.ipa`

6. 自签安装
   - Windows：Sideloadly（拖入 ipa + 你的 Apple ID 即可）
   - Mac：Xcode → Devices，或 Sideloadly
   - 手机App：AltStore / 爱思助手
   - 免费 Apple ID 有效期 7 天，开发者账号 1 年

---

## 说明

- 产物是**未签名** IPA：结构为 `Payload/GuowangQuiz.app/...`，签名工具可直接识别
- Bundle ID 当前是 `com.guowang.quiz`，自签工具会按你的证书重新签名；如需修改，改 `project.yml` 或 Xcode 里的 `PRODUCT_BUNDLE_IDENTIFIER`
- 工程内置网页资源在 `GuowangQuiz/www/`（题库 832 题），换成新版题库只需替换这个目录
- 免费额度：公开仓库 Actions 不限时长；私有仓库每月有免费额度，构建一次约 3～5 分钟，够用很多次

## 备用方案

- **Codemagic**（免费 500 分钟/月，macOS 构建）：连同一个仓库，加一个 `codemagic.yaml` 同样可以出未签名 IPA
- **借一台 Mac**：Xcode 打开 `GuowangQuiz.xcodeproj` → `Product → Archive` → `Distribute App` → `Development` 导出 IPA（最省事，且可直接带签名）
