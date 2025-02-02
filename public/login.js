/*
 * @Author: Lieyan
 * @Date: 2024-12-21 16:04:43
 * @LastEditors: Lieyan
 * @LastEditTime: 2025-02-02 14:10:20
 * @FilePath: /FireAMTController/public/script.js
 * @Description: 
 * @Contact: QQ: 2102177341  Website: lieyan.space  Github: @lieyan666
 * @Copyright: Copyright (c) 2024 by lieyanDevTeam, All Rights Reserved. 
 */

// DOM元素
const loginForm = document.getElementById('login-form');
const keyInput = document.getElementById('key');
const submitButton = loginForm.querySelector('button[type="submit"]');
const errorMessage = document.querySelector('.error-message');

// 表单验证
const validateForm = () => {
    const key = keyInput.value.trim();
    if (!key) {
        showError('请输入访问密钥');
        return false;
    }
    return true;
};

// 显示错误信息
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    keyInput.classList.add('error');

    // 添加抖动效果
    errorMessage.style.animation = 'none';
    errorMessage.offsetHeight; // 触发重排
    errorMessage.style.animation = 'shake 0.5s ease-in-out';
};

// 隐藏错误信息
const hideError = () => {
    errorMessage.style.display = 'none';
    keyInput.classList.remove('error');
};

// 设置加载状态
const setLoading = (loading) => {
    submitButton.disabled = loading;
    submitButton.classList.toggle('loading', loading);
};

// 登录处理
const handleLogin = async (e) => {
    e.preventDefault();

    // 防重复提交
    if (submitButton.disabled) {
        return;
    }

    // 表单验证
    if (!validateForm()) {
        return;
    }

    // 隐藏之前的错误信息
    hideError();

    try {
        // 显示加载状态
        setLoading(true);

        const key = keyInput.value.trim();
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
        });

        if (response.ok) {
            const { sessionKey } = await response.json();
            
            // 登录成功动画
            submitButton.style.transition = 'all 0.3s ease';
            submitButton.style.backgroundColor = '#10b981'; // 成功绿色

            // 延迟跳转以显示成功状态
            setTimeout(() => {
                window.location.href = `/session/${sessionKey}/admin`;
            }, 500);
        } else {
            throw new Error('访问密钥不正确');
        }
    } catch (error) {
        showError(error.message);
        setLoading(false);

        // 清空输入框
        keyInput.value = '';
        keyInput.focus();
    }
};

// 输入时隐藏错误信息
keyInput.addEventListener('input', hideError);

// 按下回车时自动提交
keyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(new Event('submit'));
    }
});

// 表单提交
loginForm.addEventListener('submit', handleLogin);

// 页面加载完成后聚焦到输入框
window.addEventListener('load', () => {
    keyInput.focus();
});