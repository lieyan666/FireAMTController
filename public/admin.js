/*
 * @Author: Lieyan
 * @Date: 2024-12-21 16:09:08
 * @LastEditors: Lieyan
 * @LastEditTime: 2025-02-02 14:36:50
 * @FilePath: /FireAMTController/public/admin.js
 * @Description: 
 * @Contact: QQ: 2102177341  Website: lieyan.space  Github: @lieyan666
 * @Copyright: Copyright (c) 2024 by lieyanDevTeam, All Rights Reserved. 
 */

// 从URL获取sessionKey
const path = window.location.pathname;
const sessionKey = path.split('/')[2]; // 从/session/{key}/admin中提取key

// 状态管理
let isSimpleMode = localStorage.getItem('displayMode') === 'simple';

// DOM 元素
const hostList = document.getElementById('host-list');
const hostNameInput = document.getElementById('host-name');
const hostIPInput = document.getElementById('host-ip');
const hostUserInput = document.getElementById('host-user');
const hostPassInput = document.getElementById('host-pass');
const hostTLSInput = document.getElementById('host-tls');
const hardwareInfoDiv = document.getElementById('hardware-info');
const hardwareInfoTitle = document.getElementById('hardware-info-title');
const hardwareInfoContent = document.getElementById('hardware-info-content');
const toggleModeBtn = document.getElementById('toggle-mode');

// 更新模式切换按钮样式
function updateToggleButtonStyle() {
    const button = document.getElementById('toggle-mode');
    if (isSimpleMode) {
        button.textContent = '切换到管理模式';
        button.style.backgroundColor = '#10b981'; // 简单模式使用绿色
        button.style.color = 'white';
        button.style.border = 'none';
    } else {
        button.textContent = '切换到简单模式';
        button.style.backgroundColor = '#3b82f6'; // 管理模式使用蓝色
        button.style.color = 'white';
        button.style.border = 'none';
    }
}

// 模式切换处理
toggleModeBtn.addEventListener('click', () => {
    isSimpleMode = !isSimpleMode;
    localStorage.setItem('displayMode', isSimpleMode ? 'simple' : 'manage');
    
    // 更新按钮样式并刷新页面
    updateToggleButtonStyle();
    window.location.reload();
});

// 初始化时设置表单显示状态和按钮样式
document.addEventListener('DOMContentLoaded', () => {
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
        formGroup.style.display = isSimpleMode ? 'none' : 'flex';
    }
    updateToggleButtonStyle();
});

// API基础路径
const apiBasePath = `/session/${sessionKey}`;

// 创建Toast通知系统
const createToast = (() => {
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    `;
    document.body.appendChild(container);

    return (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 12px 24px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        toast.style.backgroundColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
        toast.textContent = message;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    };
})();

// 创建加载指示器
const createLoadingSpinner = (() => {
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: none;
        z-index: 1000;
    `;
    document.body.appendChild(spinner);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        .button-clicked {
            animation: buttonClick 0.2s ease-out;
        }
        @keyframes buttonClick {
            0% { transform: scale(1); }
            50% { transform: scale(0.95); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

    return {
        show: () => spinner.style.display = 'block',
        hide: () => spinner.style.display = 'none'
    };
})();

// 电源状态映射
const powerStateNames = {
    2: '开机',
    3: '睡眠',
    4: '深度睡眠',
    6: '强制关机',
    8: '关机',
    12: '正常关机',
    13: '强制关机'
};

// 表单验证
const validateForm = () => {
    const inputs = [
        { el: hostNameInput, name: '主机名称' },
        { el: hostIPInput, name: 'IP地址' },
        { el: hostUserInput, name: '用户名' },
        { el: hostPassInput, name: '密码' }
    ];

    for (const input of inputs) {
        if (!input.el.value.trim()) {
            createToast(`${input.name}不能为空`, 'error');
            input.el.focus();
            return false;
        }
    }

    // IP地址验证
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(hostIPInput.value.trim())) {
        createToast('请输入有效的IP地址', 'error');
        hostIPInput.focus();
        return false;
    }

    return true;
};

// 获取电源状态
async function getPowerState(index) {
    try {
        const response = await fetch(`${apiBasePath}/power/${index}/state`);
        const result = await response.json();
        return result.success ? result.state : null;
    } catch (error) {
        console.error(`获取电源状态失败: ${error.message}`);
        return null;
    }
}

// 更新主机的电源状态显示
async function updateHostPowerState(index, cell) {
    const state = await getPowerState(index);
    if (state !== null) {
        cell.textContent = powerStateNames[state] || `未知(${state})`;
        cell.title = `上次更新: ${new Date().toLocaleTimeString()}`;
    } else {
        cell.textContent = '获取失败';
    }
}

// 添加按钮点击动画
const addButtonClickAnimation = (button) => {
    button.classList.add('button-clicked');
    setTimeout(() => button.classList.remove('button-clicked'), 200);
};

// 加载主机列表
async function loadHosts() {
    createLoadingSpinner.show();
    try {
        const response = await fetch(`${apiBasePath}/hosts`);
        const hosts = await response.json();
        // 更新表头
        const tableHeader = document.querySelector('thead tr');
        if (isSimpleMode) {
            tableHeader.innerHTML = `
                <th>#</th>
                <th>名称</th>
                <th>电源状态</th>
                <th>电源控制</th>
            `;
        } else {
            tableHeader.innerHTML = `
                <th>#</th>
                <th>名称</th>
                <th>IP</th>
                <th>Username</th>
                <th>TLS</th>
                <th>电源状态</th>
                <th>电源控制</th>
                <th>硬件信息</th>
                <th>操作</th>
            `;
        }

        // 更新表格内容
        hostList.innerHTML = hosts
            .map(
                (host, index) => {
                    if (isSimpleMode) {
                        return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${host.name || '未命名'}</td>
                            <td id="power-state-${index}">获取中...</td>
                            <td class="power-buttons">
                                <button onclick="powerControl(${index}, 'ON')">开机</button>
                                <button onclick="powerControl(${index}, 'OFF_SOFT')">关机</button>
                                <button onclick="powerControl(${index}, 'MASTER_BUS_RESET')">重启</button>
                            </td>
                        </tr>
                        `;
                    } else {
                        return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${host.name || '未命名'}</td>
                            <td>${host.ip}</td>
                            <td>${host.user}</td>
                            <td>${host.useTLS ? 'Yes' : 'No'}</td>
                            <td id="power-state-${index}">获取中...</td>
                            <td class="power-buttons">
                                <button onclick="powerControl(${index}, 'ON')">开机</button>
                                <button onclick="powerControl(${index}, 'OFF_SOFT')">关机</button>
                                <button onclick="powerControl(${index}, 'OFF_SOFT_GRACEFUL')">优雅关机</button>
                                <button onclick="powerControl(${index}, 'OFF_HARD')">强制关机</button>
                                <button onclick="powerControl(${index}, 'MASTER_BUS_RESET')">重启</button>
                                <button onclick="powerControl(${index}, 'SLEEP_LIGHT')">睡眠</button>
                                <button onclick="powerControl(${index}, 'SLEEP_DEEP')">深度睡眠</button>
                            </td>
                            <td>
                                <button onclick="getHardwareInfo(${index})">查看硬件信息</button>
                            </td>
                            <td>
                                <button onclick="deleteHost(${index})">删除</button>
                            </td>
                        </tr>
                        `;
                    }
                }
            )
            .join('');

        // 为所有按钮添加点击动画
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => addButtonClickAnimation(button));
        });
    } catch (error) {
        createToast('加载主机列表失败', 'error');
    } finally {
        createLoadingSpinner.hide();
    }
}

// 添加主机
document.getElementById('add-host').addEventListener('click', async () => {
    if (!validateForm()) return;

    const name = hostNameInput.value.trim();
    const ip = hostIPInput.value.trim();
    const user = hostUserInput.value.trim();
    const pass = hostPassInput.value.trim();
    const useTLS = hostTLSInput.checked;

    createLoadingSpinner.show();
    try {
        const response = await fetch(`${apiBasePath}/hosts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, ip, user, pass, useTLS }),
        });

        if (response.ok) {
            createToast('主机添加成功', 'success');
            hostNameInput.value = '';
            hostIPInput.value = '';
            hostUserInput.value = '';
            hostPassInput.value = '';
            loadHosts();
        } else {
            createToast('添加主机失败', 'error');
        }
    } catch (error) {
        createToast(`错误: ${error.message}`, 'error');
    } finally {
        createLoadingSpinner.hide();
    }
});

// 删除主机
async function deleteHost(index) {
    if (!confirm('确定要删除这个主机吗？')) {
        return;
    }
    
    createLoadingSpinner.show();
    try {
        const response = await fetch(`${apiBasePath}/hosts/${index}`, { method: 'DELETE' });
        if (response.ok) {
            createToast('主机删除成功', 'success');
            loadHosts();
        } else {
            createToast('删除主机失败', 'error');
        }
    } catch (error) {
        createToast(`错误: ${error.message}`, 'error');
    } finally {
        createLoadingSpinner.hide();
    }
}

// 电源控制
async function powerControl(index, action) {
    if (!confirm(`确定要执行${getPowerActionName(action)}操作吗？`)) {
        return;
    }

    createLoadingSpinner.show();
    try {
        const result = await fetch(`${apiBasePath}/power/${index}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ state: action })
        });

        const response = await result.json();
        if (response.success) {
            createToast(response.message || '电源控制命令已发送', 'success');
            const stateCell = document.getElementById(`power-state-${index}`);
            if (stateCell) {
                updateHostPowerState(index, stateCell);
            }
        } else {
            createToast(`电源控制失败: ${response.message}`, 'error');
        }
    } catch (error) {
        createToast(`错误: ${error.message}`, 'error');
    } finally {
        createLoadingSpinner.hide();
    }
}

// 获取电源操作名称
function getPowerActionName(action) {
    const actionNames = {
        'ON': '开机',
        'OFF_SOFT': '关机',
        'OFF_SOFT_GRACEFUL': '优雅关机',
        'OFF_HARD': '强制关机',
        'MASTER_BUS_RESET': '重启',
        'SLEEP_LIGHT': '睡眠',
        'SLEEP_DEEP': '深度睡眠'
    };
    return actionNames[action] || action;
}

// 获取硬件信息
async function getHardwareInfo(index) {
    createLoadingSpinner.show();
    try {
        const result = await fetch(`${apiBasePath}/systeminfo/${index}`);
        const response = await result.json();
        
        if (response.success) {
            const hosts = await (await fetch(`${apiBasePath}/hosts`)).json();
            const hostName = hosts[index]?.name || `主机 ${index + 1}`;
            hardwareInfoTitle.textContent = `硬件信息 - ${hostName}`;
            
            // 格式化硬件信息显示
            const formattedData = JSON.stringify(response.data, null, 2)
                .replace(/"([^"]+)":/g, '<span style="color: #2563eb">$1</span>:')
                .replace(/: "(.*?)"/g, ': <span style="color: #059669">$1</span>');
            
            hardwareInfoContent.innerHTML = `<pre style="padding: 20px; background: #f8fafc; border-radius: 8px;">${formattedData}</pre>`;
            hardwareInfoDiv.style.display = 'block';
            
            // 平滑滚动到硬件信息
            hardwareInfoDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
            createToast(`获取硬件信息失败: ${response.message}`, 'error');
        }
    } catch (error) {
        createToast(`错误: ${error.message}`, 'error');
    } finally {
        createLoadingSpinner.hide();
    }
}

// 启动所有主机的电源状态更新
function startPowerStateUpdates() {
    const hosts = document.querySelectorAll('[id^="power-state-"]');
    hosts.forEach(cell => {
        const index = cell.id.split('-')[2];
        updateHostPowerState(index, cell);
        setInterval(() => updateHostPowerState(index, cell), 30000);
    });
}

// 初始加载主机列表
async function initialize() {
    await loadHosts();
    startPowerStateUpdates();
}

// 启动应用
initialize();