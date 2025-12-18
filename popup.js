// 后端 API 地址
let API_BASE_URL = 'https://aimedia.daniu7.cn';

// 认证信息
let authToken = '';
let refreshToken = '';
let currentUser = null;
let captchaId = '';
let isRefreshing = false;

// 获取当前标签页
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// 封装带认证的请求
async function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    
    // 如果有token，添加认证头
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, options);
        
        // 处理 401 未认证
        if (response.status === 401) {
            // 如果已经在刷新中，或者当前请求就是刷新请求，则直接返回错误
            if (isRefreshing || url.includes('/auth/refresh')) {
                throw new Error('Unauthorized');
            }

            // 尝试刷新 token
            const success = await handleRefreshToken();
            if (success) {
                // 刷新成功，重试请求
                options.headers['Authorization'] = `Bearer ${authToken}`;
                return await fetch(url, options);
            } else {
                // 刷新失败，登出
                await handleLogout();
                throw new Error('Session expired');
            }
        }

        return response;
    } catch (error) {
        throw error;
    }
}

// 处理 Token 刷新
async function handleRefreshToken() {
    if (!refreshToken || isRefreshing) return false;
    
    isRefreshing = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            // 如果后端返回了新的 refresh_token，也更新它
            if (data.refresh_token) {
                refreshToken = data.refresh_token;
            }
            if (data.user) {
                currentUser = data.user;
            }
            
            await chrome.storage.local.set({ 
                authToken, 
                refreshToken, 
                currentUser 
            });
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    } finally {
        isRefreshing = false;
    }
    return false;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 从 storage 中读取配置
        const result = await chrome.storage.local.get(['apiBaseUrl', 'authToken', 'refreshToken', 'currentUser']);
        if (result.apiBaseUrl) {
            API_BASE_URL = result.apiBaseUrl;
        }
        if (result.authToken) {
            authToken = result.authToken;
            currentUser = result.currentUser;
            refreshToken = result.refreshToken || '';
        }

        // 检查登录状态
        if (authToken) {
            await checkAuthAndShowMain();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Initialization failed:', error);
        showLoginPage();
    }

    // 绑定登录页事件
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('captchaImg').addEventListener('click', refreshCaptcha);
    document.getElementById('loginSettingsBtn').addEventListener('click', openAdminPanel);
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginCaptcha').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 绑定主页事件
    document.getElementById('crawlBtn').addEventListener('click', handleCrawl);
    document.getElementById('refreshBtn').addEventListener('click', loadTasks);
    document.getElementById('settingsBtn').addEventListener('click', openAdminPanel);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

// 显示页面通用函数
function showPage(pageId) {
    // 隐藏所有页面
    ['loadingPage', 'loginPage', 'mainPage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    // 显示目标页面
    document.getElementById(pageId).classList.remove('hidden');
}

// 显示登录页
function showLoginPage() {
    showPage('loginPage');
    refreshCaptcha();
}

// 显示主页
function showMainPage() {
    showPage('mainPage');
    document.getElementById('username').textContent = currentUser?.username || '-';
}

// 检查认证并显示主页
async function checkAuthAndShowMain() {
    try {
        // 先显示主页框架，避免等待 API 请求
        showMainPage();
        
        const response = await authFetch(`${API_BASE_URL}/api/auth/me`);
        if (response.ok) {
            currentUser = await response.json();
            await chrome.storage.local.set({ currentUser });
            // 更新用户信息显示
            document.getElementById('username').textContent = currentUser?.username || '-';
            
            // 后台加载其他数据
            await detectPlatform();
            await loadTasks();
        } else {
            throw new Error('Token invalid');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // authFetch 内部已经处理了刷新失败导致的 logout
        // 但如果只是网络错误或者其他原因，authFetch 可能抛出异常
        // 如果这里没有 token 了，说明确实需要登录
        if (!authToken) {
             showLoginPage();
        }
    }
}

// 刷新验证码
async function refreshCaptcha() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/captcha`);
        if (response.ok) {
            const data = await response.json();
            captchaId = data.captcha_id;
            document.getElementById('captchaImg').src = data.captcha_image;
        }
    } catch (error) {
        console.error('获取验证码失败:', error);
        showLoginError('无法连接服务器，请检查后端地址');
    }
}

// 显示登录错误
function showLoginError(msg) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

// 隐藏登录错误
function hideLoginError() {
    document.getElementById('loginError').classList.add('hidden');
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const captchaCode = document.getElementById('loginCaptcha').value.trim();

    if (!username || !password || !captchaCode) {
        showLoginError('请填写完整信息');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
    hideLoginError();

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                captcha_id: captchaId,
                captcha_code: captchaCode
            })
        });

        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            refreshToken = data.refresh_token;
            currentUser = data.user;
            
            await chrome.storage.local.set({ authToken, refreshToken, currentUser });
            
            showMainPage();
            await detectPlatform();
            await loadTasks();
        } else {
            const error = await response.json();
            showLoginError(error.detail || '登录失败');
            refreshCaptcha();
            document.getElementById('loginCaptcha').value = '';
        }
    } catch (error) {
        console.error('登录失败:', error);
        showLoginError('无法连接服务器');
        refreshCaptcha();
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
    }
}

// 处理退出
async function handleLogout() {
    authToken = '';
    refreshToken = '';
    currentUser = null;
    await chrome.storage.local.remove(['authToken', 'refreshToken', 'currentUser']);
    showLoginPage();
}

// 检测平台
async function detectPlatform() {
    const tab = await getCurrentTab();

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectPlatform' });

        const platformNameEl = document.getElementById('platformName');
        const crawlBtn = document.getElementById('crawlBtn');

        if (response && response.platform && response.platform !== 'unknown') {
            platformNameEl.textContent = response.platformName;
            platformNameEl.classList.remove('unknown');
            crawlBtn.disabled = false;
        } else {
            platformNameEl.textContent = '未知平台（无法爬取）';
            platformNameEl.classList.add('unknown');
            crawlBtn.disabled = true;
        }
    } catch (error) {
        console.error('检测平台失败:', error);
        document.getElementById('platformName').textContent = '检测失败';
        document.getElementById('crawlBtn').disabled = true;
    }
}

// 处理爬取
async function handleCrawl() {
    const crawlBtn = document.getElementById('crawlBtn');
    crawlBtn.disabled = true;
    crawlBtn.textContent = '爬取中...';

    try {
        const tab = await getCurrentTab();
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'crawlArticle' });

        if (response && response.success) {
            const result = await authFetch(`${API_BASE_URL}/api/articles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform: response.platform,
                    article: response.article
                })
            });

            if (result.ok) {
                const data = await result.json();
                alert('文章已提交！任务ID: ' + data.task_id);
                await loadTasks();
            } else {
                const errorText = await result.text();
                // authFetch 已经处理了 401，这里只有非 401 错误
                throw new Error(`提交失败 (${result.status}): ${errorText}`);
            }
        } else {
            throw new Error(response?.error || '爬取失败');
        }
    } catch (error) {
        console.error('爬取失败:', error);
        // 如果是 Session expired，已经被 handleLogout 处理，不需要 alert
        if (error.message !== 'Session expired') {
            alert('爬取失败: ' + error.message);
        }
    } finally {
        crawlBtn.disabled = false;
        crawlBtn.textContent = '爬取文章';
    }
}

// 加载任务列表
async function loadTasks() {
    try {
        const response = await authFetch(`${API_BASE_URL}/api/articles?size=10`);

        if (!response.ok) {
            throw new Error('获取任务列表失败');
        }

        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('加载任务失败:', error);
        renderTasks([]);
    }
}

// 渲染任务列表
function renderTasks(tasks) {
    const taskList = document.getElementById('taskList');

    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">暂无任务</div>';
        return;
    }

    const statusMap = {
        'pending_rewrite': { text: '待改写', class: 'crawling' },
        'rewritten': { text: '已改写', class: 'processing' },
        'pending_publish': { text: '待发布', class: 'processing' },
        'published': { text: '已发布', class: 'completed' }
    };

    taskList.innerHTML = tasks.map(task => {
        const status = statusMap[task.status] || { text: task.status, class: 'crawling' };
        const createdAt = task.created_at ? formatTime(task.created_at) : '';

        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-title" title="${task.original_title}">${task.original_title}</div>
                <div class="task-status">
                    <span class="status-badge ${status.class}">${status.text}</span>
                    <span style="font-size: 10px; color: #999;">${task.platform || ''}</span>
                    <span class="task-time">${createdAt}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 格式化时间
function formatTime(timeStr) {
    const date = new Date(timeStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

// 打开后台管理
function openAdminPanel() {
    // 从API地址提取后台管理地址（假设前端在同一服务器的3000端口）
    const url = new URL(API_BASE_URL);
    const adminUrl = `${url.protocol}//${url.hostname}`;
    
    chrome.tabs.create({ url: adminUrl });
}
