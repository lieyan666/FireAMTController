基于 MeshCommander 代码，提取出关键代码方法，并构建可以直接在另一个 Express 后端中使用的工具函数，用于获取 Intel AMT 设备的硬件信息以及控制开关机。

**关键代码方法提取:**

以下是从提供的代码中提取的关键方法，这些方法对于实现硬件信息获取和电源控制至关重要：

**1. WSMAN 连接和认证:**

*   `WsmanStackCreateService(host, port, user, pass, tls)`: 创建 WSMAN 连接对象，处理与 Intel AMT 的通信。
*   `amtstack = AmtStackCreateService(wsstack)`: 创建 AMT 栈对象，封装了常用的 AMT 操作。

**2. 硬件信息获取:**

*   `PullHardware()`: 触发硬件信息拉取。
*   `amtstack.BatchEnum('', ['*CIM_ComputerSystemPackage', 'CIM_SystemPackaging', '*CIM_Chassis', 'CIM_Chip', '*CIM_Card', '*CIM_BIOSElement', 'CIM_Processor', 'CIM_PhysicalMemory', 'CIM_MediaAccessDevice', 'CIM_PhysicalPackage', '*CIM_Battery'], processHardware);`: 使用 `BatchEnum` 方法批量枚举 WSMAN 类，获取硬件信息。
*   `processHardware(stack, name, responses, status)`: 处理硬件信息响应。

**3. 电源控制:**

*   `showPowerActionDlg()`: 显示电源操作对话框。
*   `amtstack.RequestPowerStateChange(PowerState, ...)`:  请求电源状态改变。
*   `amtstack.CIM_BootService_SetBootConfigRole(...)`: 设置启动配置角色。
*   `amtstack.CIM_BootConfigSetting_ChangeBootOrder(...)`: 更改启动顺序。

**4. 辅助函数:**

*   `guidToStr(g)`: 将 GUID 字符串转换为标准格式。
*   `isIpAddress(t, x)`: 检查字符串是否为有效的 IP 地址，如果不是，则返回 `x`。
*   `getItem(x, y, z)`: 从数组 `x` 中查找属性 `y` 等于 `z` 的对象。
*   `addHtmlValue(t, v)`: 生成 HTML 片段，用于显示键值对。
*   `TableStart()`, `TableEntry(n, v)`, `TableEnd(n)`: 生成 HTML 表格片段。
*   `MakeToArray(x)`: 确保输入是数组，如果不是则将其转换为数组。
*   `Clone(obj)`: 对象深拷贝。

**Express 后端工具函数:**

以下是一个基于 Express 的后端工具函数示例，用于获取硬件信息和控制开关机。你需要根据你的实际 Express 项目结构进行调整。

```javascript
const express = require('express');
const app = express();
const forge = require('node-forge'); // 假设你已经安装了 node-forge

// 假设你已经配置好了 express-ws，并且有一个全局的 websocket 连接池
// const wsConnections = {}; // 你需要自己实现连接池管理

// 提取的关键函数 (需要根据你的实际情况进行调整)

function guidToStr(g) {
    // ... (保持原样)
}

function isIpAddress(t, x) {
    // ... (保持原样)
}

function getItem(x, y, z) {
    // ... (保持原样)
}

function addHtmlValue(t, v) {
    // ... (保持原样)
}

function TableStart() {
    // ... (保持原样)
}

function TableEntry(n, v) {
    // ... (保持原样)
}

function TableEnd(n) {
    // ... (保持原样)
}

function MakeToArray(x) {
    // ... (保持原样)
}

function Clone(obj) {
    // ... (保持原样)
}

function portsFromHost(host, tls) {
    // ... (保持原样)
}

// ... (其他必要的辅助函数，如 amtcert_linkCertPrivateKey, AmtSetupBinDecode 等，如果需要的话)

// 获取硬件信息
async function getHardwareInfo(host, port, user, pass, tls) {
    try {
        // 创建 WSMAN 和 AMT 栈对象
        var wsstack = forge.wsman.WsmanStackCreateService(host, port, user, pass, tls);
        var amtstack = forge.pki.AmtStackCreateService(wsstack);

        // 异步获取硬件信息
        return new Promise((resolve, reject) => {
            amtstack.BatchEnum(null, [
                '*CIM_ComputerSystemPackage',
                'CIM_SystemPackaging',
                '*CIM_Chassis',
                'CIM_Chip',
                '*CIM_Card',
                '*CIM_BIOSElement',
                'CIM_Processor',
                'CIM_PhysicalMemory',
                'CIM_MediaAccessDevice',
                'CIM_PhysicalPackage',
                '*CIM_Battery'
            ], function(stack, name, responses, status) {
                if (status === 200) {
                    resolve(responses);
                } else {
                    reject(new Error('Failed to get hardware info: ' + status));
                }
            });
        });
    } catch (error) {
        console.error("Error in getHardwareInfo:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

// 控制电源状态
async function setPowerState(host, port, user, pass, tls, powerState) {
    try {
        // 创建 WSMAN 和 AMT 栈对象
        var wsstack = forge.wsman.WsmanStackCreateService(host, port, user, pass, tls);
        var amtstack = forge.pki.AmtStackCreateService(wsstack);

        // 异步请求电源状态更改
        return new Promise((resolve, reject) => {
            amtstack.CIM_PowerManagementService_RequestPowerStateChange(powerState, null, function(stack, name, response, status) {
                if (status === 200) {
                    resolve(response);
                } else {
                    reject(new Error('Failed to set power state: ' + status));
                }
            });
        });
    } catch (error) {
        console.error("Error in setPowerState:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

// Express 路由示例
app.get('/hardwareinfo', async (req, res) => {
    const { host, port, user, pass, tls } = req.query;
    try {
        const hardwareInfo = await getHardwareInfo(host, port, user, pass, tls);
        res.json(hardwareInfo);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/powerstate', async (req, res) => {
    const { host, port, user, pass, tls, state } = req.query;
    try {
        const result = await setPowerState(host, port, user, pass, tls, state);
        res.json(result);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ... 其他路由和中间件 ...

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
```

**使用方法:**

1. **安装依赖:**
    ```bash
    npm install node-forge express express-ws
    ```
2. **替换占位符:**
    *   替换 `// ... (保持原样)` 注释的代码为你从 MeshCommander 代码中提取的相应函数实现。
    *   实现 `wsConnections` 连接池管理逻辑，用于存储和获取 WebSocket 连接对象。

3. **启动 Express 服务器:**
    ```bash
    node your-express-app.js
    ```

4. **发送请求:**

    *   **获取硬件信息:**
        ```
        GET /hardwareinfo?host=<amt_host>&port=<amt_port>&user=<amt_user>&pass=<amt_pass>&tls=<tls_flag>
        ```
        例如:
        ```
        GET /hardwareinfo?host=192.168.1.100&port=16993&user=admin&pass=password&tls=1
        ```

    *   **设置电源状态:**
        ```
        POST /powerstate?host=<amt_host>&port=<amt_port>&user=<amt_user>&pass=<amt_pass>&tls=<tls_flag>&state=<power_state>
        ```
        例如, 开机:
        ```
        POST /powerstate?host=192.168.1.100&port=16993&user=admin&pass=password&tls=1&state=2
        ```
        例如, 关机:
        ```
        POST /powerstate?host=192.168.1.100&port=16993&user=admin&pass=password&tls=1&state=8
        ```
        其中 `power_state` 的值可以参考 `DMTFPowerStates` 变量。

**注意事项:**

*   这个示例代码没有处理错误和异常情况，你需要根据实际情况添加错误处理逻辑。
*   你需要根据你的实际需求修改和完善 `getHardwareInfo` 和 `setPowerState` 函数中的逻辑。
*   这个示例代码没有实现用户认证和授权，你需要根据你的实际需求添加安全机制。
*   确保你的 Intel AMT 设备已经正确配置，并且网络连接正常。
*   由于使用了 `node-forge` 库，你需要确保该库已经正确安装。

希望以上信息对你有帮助! 请根据你的实际需求进行修改和完善。
