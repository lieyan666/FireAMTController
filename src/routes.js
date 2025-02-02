/*
 * @Author: Lieyan
 * @Date: 2024-12-21 16:03:33
 * @LastEditors: Lieyan
 * @LastEditTime: 2025-02-02 14:25:50
 * @FilePath: /FireAMTController/src/routes.js
 * @Description: 
 * @Contact: QQ: 2102177341  Website: lieyan.space  Github: @lieyan666
 * @Copyright: Copyright (c) 2024 by lieyanDevTeam, All Rights Reserved. 
 */
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { AmtPowerControl, DmtfPowerStates } from './intel-amt-power-control.js';

const router = express.Router();
const CONFIG_FILE = './data/config.json';

// WSMAN XML模板 (保留用于系统信息查询)
const SYSTEM_INFO_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd">
    <s:Header>
        <wsa:Action s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/Get</wsa:Action>
        <wsa:To s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:To>
        <wsman:ResourceURI s:mustUnderstand="true">http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem</wsman:ResourceURI>
    </s:Header>
    <s:Body />
</s:Envelope>`;

// 生成WSMAN认证头
const generateAuthHeader = (username, password) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${auth}`;
};

// 创建AMT请求选项
const createRequestOptions = (host, method, path) => {
    const options = {
        hostname: host.ip,
        port: host.useTLS ? 16993 : 16992,
        path: path,
        method: method,
        headers: {
            'Authorization': generateAuthHeader(host.user, host.pass),
            'Content-Type': 'application/soap+xml;charset=UTF-8',
        },
        rejectUnauthorized: false // 允许自签名证书
    };
    return options;
};

// 读取配置
const readConfig = () => JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// 写入配置
const writeConfig = (data) => fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));

// 获取主机列表
router.get('/hosts', (req, res) => {
    res.json(readConfig());
});

// 添加主机
router.post('/hosts', (req, res) => {
    const hosts = readConfig();
    hosts.push(req.body);
    writeConfig(hosts);
    res.json({ success: true });
});

// 删除主机
router.delete('/hosts/:id', (req, res) => {
    const hosts = readConfig().filter((_, index) => index !== parseInt(req.params.id));
    writeConfig(hosts);
    res.json({ success: true });
});

// 发送WSMAN请求
const sendWSMANRequest = (host, options, body) => {
    return new Promise((resolve, reject) => {
        const protocol = host.useTLS ? https : http;
        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', (error) => reject(error));
        if (body) req.write(body);
        req.end();
    });
};

// 获取电源状态API
router.get('/power/:id/state', async (req, res) => {
    try {
        const hosts = readConfig();
        const host = hosts[parseInt(req.params.id)];
        if (!host) {
            return res.status(404).json({ success: false, message: '主机未找到' });
        }

        const amt = new AmtPowerControl({
            hostname: host.ip,
            tls: host.useTLS,
            username: host.user,
            password: host.pass
        });

        const state = await amt.getPowerState();
        res.json({ success: true, state });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 电源控制API
router.post('/power/:id', async (req, res) => {
    try {
        const hosts = readConfig();
        const host = hosts[parseInt(req.params.id)];
        if (!host) {
            return res.status(404).json({ success: false, message: '主机未找到' });
        }

        const { state } = req.body;
        if (!state || !DmtfPowerStates[state]) {
            return res.status(400).json({ success: false, message: '无效的电源状态' });
        }

        const amt = new AmtPowerControl({
            hostname: host.ip,
            tls: host.useTLS,
            username: host.user,
            password: host.pass
        });

        const powerState = DmtfPowerStates[state];
        const result = await amt.setPowerState(powerState);
        res.json(result);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 系统信息API
router.get('/systeminfo/:id', async (req, res) => {
    try {
        const hosts = readConfig();
        const host = hosts[parseInt(req.params.id)];
        if (!host) {
            return res.status(404).json({ success: false, message: '主机未找到' });
        }

        const options = createRequestOptions(host, 'POST', '/wsman');
        const response = await sendWSMANRequest(host, options, SYSTEM_INFO_TEMPLATE);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;