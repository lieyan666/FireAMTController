/*
 * @Author: Lieyan
 * @Date: 2024-12-21 16:01:09
 * @LastEditors: Lieyan
 * @LastEditTime: 2025-02-02 14:24:34
 * @FilePath: /FireAMTController/src/app.js
 * @Description: 
 * @Contact: QQ: 2102177341  Website: lieyan.space  Github: @lieyan666
 * @Copyright: Copyright (c) 2024 by lieyanDevTeam, All Rights Reserved. 
 */
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import md5 from 'md5';
import routes from './routes.js';

// 读取配置文件
const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));

const app = express();
const PORT = settings.port;
const SECRET_KEY = md5(settings.secret_key);

// 中间件
app.use(bodyParser.json());
app.use('/public', express.static('./public'));

app.get('/', (req, res) => {
    res.redirect(302, '/web/login');
});

app.get('/web/login', (req, res) => {
    res.sendFile('public/login.html', { root: '.' });
});

// 登录密钥验证
app.post('/login', (req, res) => {
    const { key } = req.body;
    if (md5(key) === SECRET_KEY) {
        res.json({ success: true, sessionKey: md5(key) });
    } else {
        res.status(401).json({ success: false, message: 'Invalid key' });
    }
});

// 验证中间件
const validateSession = (req, res, next) => {
    const sessionKey = req.params.key;
    if (sessionKey === SECRET_KEY) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Invalid session' });
    }
};

// Admin页面路由
app.get('/session/:key/admin', validateSession, (req, res) => {
    res.sendFile('public/admin.html', { root: '.' });
});

// API路由
app.use('/session/:key', validateSession, routes);

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});