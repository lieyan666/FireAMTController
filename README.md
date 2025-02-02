# FireAMTController

基于Intel AMT的远程电源管理控制

## 项目结构

```
FireAMTController/
├── src/                    # 源代码目录
│   ├── app.js             # 应用入口文件
│   ├── routes.js          # API路由定义
│   └── intel-amt-power-control.js  # AMT电源控制核心实现
├── data/                   # 数据文件目录
│   ├── config.json        # 主机配置文件
│   ├── config.example.json # 主机配置示例
│   ├── settings.json      # 服务器配置文件
│   └── settings.example.json # 服务器配置示例
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   ├── admin.html         # 管理页面
│   ├── script.js          # 主页面脚本
│   └── admin.js           # 管理页面脚本
└── reference/              # 参考代码
    └── intel-amt-toggle-power-example.js  # 电源控制示例
    └── info.md
```

## 配置说明

### 主机配置 (data/config.json)

用于配置需要管理的AMT设备列表：

```json
[
  {
    "name": "设备名称",
    "ip": "AMT设备IP地址",
    "user": "AMT管理用户名",
    "pass": "AMT管理密码",
    "useTLS": true  // 是否使用TLS加密连接(true: 16993端口, false: 16992端口)
  }
]
```

### 服务器配置 (data/settings.json)

用于配置服务器运行参数：

```json
{
  "port": 3000,          // 服务器监听端口
  "secret_key": "xxxx"   // 服务器密钥
}
```

首次使用时，请复制示例配置文件并修改：
```bash
cp data/config.example.json data/config.json
cp data/settings.example.json data/settings.json
```

## API接口

### 获取主机列表
- GET `/hosts`

### 添加主机
- POST `/hosts`

### 删除主机
- DELETE `/hosts/:id`

### 获取电源状态
- GET `/power/:id/state`

### 控制电源
- POST `/power/:id`
  - body: `{ "state": "PowerOn|PowerOff|Reset|..." }`

### 获取系统信息
- GET `/systeminfo/:id`

## 开发

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产模式运行
npm start
```

## 安全说明

1. 确保修改默认的secret_key
2. 建议使用TLS加密连接（useTLS: true）
3. 使用强密码保护AMT账户
4. 不要将配置文件提交到版本控制系统中

## 许可

GPL-3.0