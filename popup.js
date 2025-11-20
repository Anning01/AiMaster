// 后端 API 地址
let API_BASE_URL = 'http://localhost:8000';

// 获取当前标签页
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 从 storage 中读取后端地址
    const result = await chrome.storage.local.get(['apiBaseUrl']);
    if (result.apiBaseUrl) {
        API_BASE_URL = result.apiBaseUrl;
    }

    // 检测当前页面平台
    await detectPlatform();

    // 加载任务列表
    await loadTasks();

    // 绑定事件
    document.getElementById('crawlBtn').addEventListener('click', handleCrawl);
    document.getElementById('refreshBtn').addEventListener('click', loadTasks);
    document.getElementById('settingsBtn').addEventListener('click', handleSettings);
});

// 检测平台
async function detectPlatform() {
    const tab = await getCurrentTab();

    try {
        // 向 content script 发送消息获取平台信息
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

    console.log('=== 开始爬取文章 ===');

    try {
        const tab = await getCurrentTab();
        console.log('当前标签页:', tab.url);

        // 向 content script 发送爬取消息
        console.log('发送爬取消息到 content script...');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'crawlArticle' });
        console.log('Content script 响应:', response);

        if (response && response.success) {
            console.log('爬取成功，文章数据:', {
                platform: response.platform,
                title: response.article.title,
                contentLength: response.article.contents?.length || response.article.content?.length || 0,
                imagesCount: response.article.images?.length || 0,
                commentsCount: response.article.commentCount || 0
            });

            // 将数据发送到后端
            console.log('提交数据到后端:', API_BASE_URL);
            const requestBody = {
                user: 'admin',
                platform: response.platform,
                article: response.article
            };
            console.log('请求体:', JSON.stringify(requestBody, null, 2));

            const result = await fetch(`${API_BASE_URL}/api/articles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('后端响应状态:', result.status, result.statusText);

            if (result.ok) {
                const data = await result.json();
                console.log('后端响应数据:', data);
                alert('文章已提交处理！任务ID: ' + data.task_id);
                await loadTasks();
            } else {
                const errorText = await result.text();
                console.error('后端返回错误:', errorText);
                throw new Error(`提交失败 (${result.status}): ${errorText}`);
            }
        } else {
            console.error('爬取失败，响应:', response);
            throw new Error(response?.error || '爬取失败');
        }
    } catch (error) {
        console.error('=== 爬取过程出错 ===');
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);

        let errorMsg = error.message;
        if (error.message.includes('Failed to fetch')) {
            errorMsg = '无法连接到后端服务器，请检查：\n' +
                      '1. 后端服务是否启动\n' +
                      '2. 后端地址是否正确: ' + API_BASE_URL + '\n' +
                      '3. 后端是否开启了CORS';
        }

        alert('爬取失败: ' + errorMsg);
    } finally {
        crawlBtn.disabled = false;
        crawlBtn.textContent = '爬取文章';
        console.log('=== 爬取流程结束 ===');
    }
}

// 加载任务列表
async function loadTasks() {
    console.log('=== 加载任务列表 ===');
    console.log('后端地址:', API_BASE_URL);

    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks?user=admin`);
        console.log('任务列表响应状态:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error('获取任务列表失败: ' + response.status);
        }

        const tasks = await response.json();
        console.log('获取到任务数量:', tasks.length);
        if (tasks.length > 0) {
            console.log('任务列表:', tasks);
        }
        renderTasks(tasks);
    } catch (error) {
        console.error('加载任务失败:', error);
        console.error('错误详情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        // 如果后端未连接，显示空状态
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

    taskList.innerHTML = tasks.map(task => {
        const statusMap = {
            'crawling': { text: '爬取中', class: 'crawling' },
            'processing': { text: 'AI改写中', class: 'processing' },
            'completed': { text: '已完成', class: 'completed' },
            'error': { text: '失败', class: 'error' }
        };

        const status = statusMap[task.status] || { text: task.status, class: 'crawling' };
        const progress = task.progress || 0;

        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-title" title="${task.title}">${task.title}</div>
                <div class="task-status">
                    <span class="status-badge ${status.class}">${status.text}</span>
                    <span style="font-size: 11px; color: #999;">${task.platform || '未知平台'}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div style="font-size: 11px; color: #999; margin-bottom: 6px;">
                    进度: ${progress}%
                </div>
                ${task.status === 'completed' ? `
                    <div class="task-actions">
                        <button class="btn-small btn-publish" onclick="handlePublish('${task.id}', '${task.targetPlatform || 'auto'}')">
                            发布到编辑器
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 处理发布
window.handlePublish = async function(task_id, targetPlatform) {
    try {
        // 获取任务详情
        const response = await fetch(`${API_BASE_URL}/api/tasks/${task_id}`);
        if (!response.ok) {
            throw new Error('获取任务详情失败');
        }

        const task = await response.json();

        // 获取当前标签页
        const tab = await getCurrentTab();

        // 向 content script 发送发布消息
        const result = await chrome.tabs.sendMessage(tab.id, {
            action: 'publishArticle',
            article: task.rewrittenArticle,
            platform: targetPlatform
        });

        if (result && result.success) {
            alert('文章已插入编辑器！');
        } else {
            throw new Error(result?.error || '发布失败');
        }
    } catch (error) {
        console.error('发布失败:', error);
        alert('发布失败: ' + error.message + '\n\n请确保当前页面是支持的发布平台');
    }
};

// 处理设置
async function handleSettings() {
    const newUrl = prompt('请输入后端 API 地址:', API_BASE_URL);

    if (newUrl && newUrl.trim()) {
        API_BASE_URL = newUrl.trim();
        await chrome.storage.local.set({ apiBaseUrl: API_BASE_URL });
        alert('后端地址已更新！');
        await loadTasks();
    }
}
