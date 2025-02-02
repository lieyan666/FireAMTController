#!/usr/bin/node

import CreateWsmanComm from 'meshcentral/amt/amt-wsman-comm.js';
import WsmanStackCreateService from 'meshcentral/amt/amt-wsman.js';
import AmtStackCreateService from 'meshcentral/amt/amt.js';

// Power states constants
const DmtfPowerStates = {
    ON: 2,                    // DmtfPowerStateOn
    SLEEP_LIGHT: 3,          // Sleep - Light
    SLEEP_DEEP: 4,           // Sleep - Deep
    OFF_SOFT: 8,             // DmtfPowerStateOffSoft
    OFF_HARD: 6,             // DmtfPowerStateOffHard
    POWER_CYCLE_SOFT: 5,     // Power Cycle (Off - Soft)
    POWER_CYCLE_HARD: 9,     // Power Cycle (Off - Hard)
    MASTER_BUS_RESET: 10,    // DmtfPowerStateMasterBusReset
    OFF_SOFT_GRACEFUL: 12,   // DmtfPowerStateOffSoftGraceful
    OFF_HARD_GRACEFUL: 13    // DmtfPowerStateOffHardGraceful
};

function sleep(ms) {
    return new Promise((resolve, _reject) => setTimeout(resolve, ms));
}

class AmtPowerControl {
    constructor(settings) {
        this._amtUrl = `http${settings.tls ? 's' : ''}://${settings.hostname}:${settings.tls ? 16993 : 16992}`;
        const comm = CreateWsmanComm(
            settings.hostname,
            settings.tls ? 16993 : 16992,
            settings.username,
            settings.password,
            settings.tls ? 1 : 0);
        const wsstack = WsmanStackCreateService(comm);
        this._amt = AmtStackCreateService(wsstack);
        this._requestPowerStateChange = this._promisifyRequestPowerStateChange(this._amt);
    }

    _promisifyRequestPowerStateChange(amt) {
        return (powerState) => {
            return new Promise((resolve, reject) => {
                amt.RequestPowerStateChange(powerState, (stack, name, response, status) => {
                    switch (status) {
                        case 200:
                            resolve(response.Body);
                            break;
                        case 401:
                            reject(new Error("认证失败：无效的用户名、密码或权限不足"));
                            break;
                        default:
                            reject(new Error("请求失败，状态码: " + status));
                            break;
                    }
                });
            });
        };
    }

    async getPowerState() {
        return new Promise((resolve, reject) => {
            this._amt.Get("CIM_AssociatedPowerManagementService", (stack, name, response, status) => {
                if (status === 200) {
                    resolve(response.Body.PowerState);
                } else {
                    reject(new Error("获取电源状态失败，状态码: " + status));
                }
            }, 0, 1);
        });
    }

    async getAvailablePowerStates() {
        return new Promise((resolve, reject) => {
            this._amt.Get("CIM_AssociatedPowerManagementService", (stack, name, response, status) => {
                if (status === 200) {
                    const states = response.Body.AvailableRequestedPowerStates;
                    if (states === undefined) {
                        resolve([]);
                        return;
                    }
                    resolve(Number.isInteger(states) ? [states] : states);
                } else {
                    reject(new Error("获取可用电源状态失败，状态码: " + status));
                }
            }, 0, 1);
        });
    }

    async setPowerState(powerState, waitForState = true, timeout = 30000) {
        // 验证电源状态值是否有效
        const validPowerStates = Object.values(DmtfPowerStates);
        if (!validPowerStates.includes(powerState)) {
            throw new Error("无效的电源状态值");
        }

        // 检查当前状态
        const currentState = await this.getPowerState();
        if (currentState === powerState) {
            return { success: true, message: "系统已经处于请求的电源状态" };
        }

        // 设置电源状态
        await this._requestPowerStateChange(powerState);

        if (!waitForState) {
            return { success: true, message: "电源状态更改命令已发送" };
        }

        // 等待状态变化
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const currentState = await this.getPowerState();
            if (currentState === powerState) {
                return { success: true, message: "电源状态已成功更改" };
            }
            await sleep(1000);
        }

        return { success: true, message: "电源控制命令已发送，但状态可能仍在变化中" };
    }
}

export { AmtPowerControl, DmtfPowerStates };