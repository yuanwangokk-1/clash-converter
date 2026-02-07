
// ==================== 常量定义 ====================
const STORAGE_KEYS = {
    HISTORY: 'clash_converter_history',
    CONFIG: 'clash_converter_config',
    TEMPLATES: 'clash_converter_templates'
};

const MAX_HISTORY_ITEMS = 20;
const MAX_LOG_ENTRIES = 100;
const CONVERSION_BASE_URL = 'https://url.v1.mk/sub?target=clash&url=';

// 模板配置URL
const TEMPLATE_CONFIGS = {
    default: 'https%3A%2F%2Fraw%2Egithubusercontent%2Ecom%2FACL4SSR%2FACL4SSR%2Frefs%2Fheads%2Fmaster%2FClash%2Fconfig%2FACL4SSR%5FOnline%2Eini',
    minimal: 'https%3A%2F%2Fraw%2Egithubusercontent%2Ecom%2FACL4SSR%2FACL4SSR%2Frefs%2Fheads%2Fmaster%2FClash%2Fconfig%2FACL4SSR%5FMini%2Eini',
    full: 'https%3A%2F%2Fraw%2Egithubusercontent%2Ecom%2FACL4SSR%2FACL4SSR%2Frefs%2Fheads%2Fmaster%2FClash%2Fconfig%2FACL4SSR%5FOnline%5FFull%2Eini',
    custom: null
};

// ==================== DOM元素引用 ====================
const $ = selector => document.getElementById(selector);

// 单链接转换元素
const originalUrlInput = $('originalUrl');
const historyDropdown = $('historyDropdown');
const emojiCheckbox = $('emojiCheckbox');
const udpCheckbox = $('udpCheckbox');
const tfoCheckbox = $('tfoCheckbox');
const xudpCheckbox = $('xudpCheckbox');
const scvCheckbox = $('scvCheckbox');
const convertBtn = $('convertBtn');
const copyBtn = $('copyBtn');
const exportBtn = $('exportBtn');
const clearBtn = $('clearBtn');
const convertedUrlTextarea = $('convertedUrl');
const resultStats = $('resultStats');
const progressFill = $('progressFill');

// 批量转换元素
const batchUrlsTextarea = $('batchUrls');
const batchEmojiCheckbox = $('batchEmojiCheckbox');
const batchUdpCheckbox = $('batchUdpCheckbox');
const batchTfoCheckbox = $('batchTfoCheckbox');
const batchConvertBtn = $('batchConvertBtn');
const batchCopyBtn = $('batchCopyBtn');
const batchExportBtn = $('batchExportBtn');
const batchClearBtn = $('batchClearBtn');
const batchResults = $('batchResults');
const batchResultCount = $('batchResultCount');
const batchProgressFill = $('batchProgressFill');

// 配置管理元素
const configTemplateSelect = $('configTemplate');
const customConfigUrlInput = $('customConfigUrl');
const importBtn = $('importBtn');
const exportConfigBtn = $('exportConfigBtn');
const clearHistoryBtn = $('clearHistoryBtn');
const historyList = $('historyList');

// 日志和UI元素
const logContent = $('logContent');
const currentTimeSpan = $('currentTime');
const clearLogBtn = $('clearLogBtn');
const toggleLogBtn = $('toggleLogBtn');
const toast = $('toast');
const importFileInput = $('importFile');

// 标签页元素
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// ==================== 状态管理 ====================
let isProcessing = false;
let isLogCollapsed = false;

// ==================== 工具函数 ====================

/**
 * URL验证函数
 */
const isValidUrl = (urlString) => {
    if (!urlString) return false;
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

/**
 * 防抖函数
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * 显示Toast通知
 */
const showToast = (message, type = 'info', duration = 3000) => {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
};

/**
 * 更新当前时间显示
 */
const updateTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    currentTimeSpan.textContent = `[${timeString}] `;
};

/**
 * 添加日志条目
 */
const addLogEntry = (message, type = 'info') => {
    if (isLogCollapsed) return;
    
    // 限制日志数量
    if (logContent.children.length >= MAX_LOG_ENTRIES) {
        logContent.removeChild(logContent.firstChild);
    }
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = `[${timeString}] `;
    
    logEntry.appendChild(timestampSpan);
    logEntry.appendChild(document.createTextNode(message));
    
    logContent.appendChild(logEntry);
    logContent.scrollTop = logContent.scrollHeight;
};

/**
 * 获取配置参数
 */
const getConfigParams = (useBatch = false) => {
    const template = configTemplateSelect.value;
    let templateConfig = '';
    
    // 根据模板选择配置
    if (template === 'custom' && customConfigUrlInput.value) {
        const customUrl = customConfigUrlInput.value.trim();
        if (isValidUrl(customUrl)) {
            templateConfig = `&config=${encodeURIComponent(customUrl)}`;
        } else {
            addLogEntry('自定义配置URL无效，使用默认模板', 'warning');
            templateConfig = `&config=${TEMPLATE_CONFIGS.default}`;
        }
    } else if (TEMPLATE_CONFIGS[template]) {
        templateConfig = `&config=${TEMPLATE_CONFIGS[template]}`;
    } else {
        templateConfig = `&config=${TEMPLATE_CONFIGS.default}`;
    }
    
    // 基础参数
    const baseParams = '&insert=false&expand=true&fdn=false&new_name=true';
    
    // 根据复选框添加参数
    const params = [];
    
    // 单链接转换参数
    if (!useBatch) {
        if (emojiCheckbox.checked) params.push('emoji=true');
        if (udpCheckbox.checked) params.push('udp=true');
        if (tfoCheckbox.checked) params.push('tfo=true');
        if (xudpCheckbox.checked) params.push('xudp=true');
        if (scvCheckbox.checked) params.push('scv=true');
    } else {
        // 批量转换参数
        if (batchEmojiCheckbox.checked) params.push('emoji=true');
        if (batchUdpCheckbox.checked) params.push('udp=true');
        if (batchTfoCheckbox.checked) params.push('tfo=true');
    }
    
    // 添加其他默认参数
    if (!params.includes('emoji=true')) params.push('emoji=false');
    if (!params.includes('udp=true')) params.push('udp=false');
    if (!params.includes('tfo=true')) params.push('tfo=false');
    if (!params.includes('xudp=true')) params.push('xudp=false');
    if (!params.includes('scv=true')) params.push('scv=false');
    params.push('list=false');
    
    return templateConfig + baseParams + '&' + params.join('&');
};

/**
 * 构建转换后的URL
 */
const buildConvertedUrl = (originalUrl, useBatch = false) => {
    const encodedUrl = encodeURIComponent(originalUrl);
    const configParams = getConfigParams(useBatch);
    return CONVERSION_BASE_URL + encodedUrl + configParams;
};

// ==================== 本地存储操作 ====================
const storage = {
    saveHistory: (url) => {
        try {
            const history = storage.getHistory();
            const newHistory = [{
                url,
                timestamp: new Date().toISOString(),
                convertedUrl: buildConvertedUrl(url)
            }, ...history.filter(item => item.url !== url)].slice(0, MAX_HISTORY_ITEMS);
            
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
            storage.updateHistoryDisplay();
        } catch (e) {
            console.warn('保存历史记录失败:', e);
        }
    },
    
    getHistory: () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
        } catch (e) {
            return [];
        }
    },
    
    clearHistory: () => {
        try {
            localStorage.removeItem(STORAGE_KEYS.HISTORY);
            storage.updateHistoryDisplay();
            addLogEntry('历史记录已清空', 'success');
            showToast('历史记录已清空', 'success');
        } catch (e) {
            addLogEntry('清空历史记录失败', 'error');
        }
    },
    
    updateHistoryDisplay: () => {
        const history = storage.getHistory();
        const historyListContent = $('historyList');
        historyListContent.innerHTML = '';
        
        if (history.length === 0) {
            historyListContent.innerHTML = '<div class="log-entry info">暂无历史记录</div>';
            return;
        }
        
        history.forEach((item, index) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry info';
            
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            entry.innerHTML = `
                <span class="timestamp">[${timeStr}]</span>
                <span>${item.url.substring(0, 50)}${item.url.length > 50 ? '...' : ''}</span>
                <button class="history-use-btn" data-url="${item.url}" style="margin-left: 10px; padding: 2px 8px; font-size: 12px; background: #4a00e0; color: white; border: none; border-radius: 4px; cursor: pointer;">使用</button>
            `;
            
            historyListContent.appendChild(entry);
        });
        
        // 为历史记录按钮添加事件
        document.querySelectorAll('.history-use-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.getAttribute('data-url');
                originalUrlInput.value = url;
                originalUrlInput.focus();
                showToast('历史链接已填充', 'info');
            });
        });
    },
    
    saveConfig: (config) => {
        try {
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
        } catch (e) {
            console.warn('保存配置失败:', e);
        }
    },
    
    loadConfig: () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}');
        } catch (e) {
            return {};
        }
    }
};

// ==================== 事件处理函数 ====================

/**
 * 单链接转换处理
 */
const handleConvert = async () => {
    const originalUrl = originalUrlInput.value.trim();
    
    if (!originalUrl) {
        addLogEntry('错误：请输入订阅链接', 'error');
        showToast('请输入订阅链接', 'error');
        originalUrlInput.focus();
        return;
    }
    
    if (!isValidUrl(originalUrl)) {
        addLogEntry('错误：请输入有效的URL链接', 'error');
        showToast('请输入有效的URL链接', 'error');
        return;
    }
    
    try {
        // 显示加载状态
        convertBtn.classList.add('loading');
        convertBtn.disabled = true;
        progressFill.style.width = '30%';
        
        addLogEntry('开始转换链接...', 'info');
        
        // 模拟网络延迟，实际使用时可以移除
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 构建转换后的URL
        const convertedUrl = buildConvertedUrl(originalUrl);
        
        // 显示结果
        progressFill.style.width = '100%';
        convertedUrlTextarea.value = convertedUrl;
        
        // 更新统计信息
        const urlLength = convertedUrl.length;
        const templateName = configTemplateSelect.options[configTemplateSelect.selectedIndex].text;
        resultStats.innerHTML = `长度: ${urlLength} 字符 | 模板: ${templateName}`;
        
        // 保存到历史记录
        storage.saveHistory(originalUrl);
        
        addLogEntry('成功：链接已转换', 'success');
        showToast('链接转换成功', 'success');
        
    } catch (error) {
        addLogEntry(`错误：${error.message}`, 'error');
        showToast('转换失败', 'error');
        progressFill.style.width = '0%';
    } finally {
        // 移除加载状态
        convertBtn.classList.remove('loading');
        convertBtn.disabled = false;
        
        // 重置进度条
        setTimeout(() => {
            progressFill.style.width = '0%';
        }, 1000);
    }
};

/**
 * 批量转换处理
 */
const handleBatchConvert = async () => {
    const batchText = batchUrlsTextarea.value.trim();
    
    if (!batchText) {
        addLogEntry('批量转换错误：请输入链接列表', 'error');
        showToast('请输入链接列表', 'error');
        return;
    }
    
    const urls = batchText.split('\n')
        .map(url => url.trim())
        .filter(url => url && isValidUrl(url));
    
    if (urls.length === 0) {
        addLogEntry('批量转换错误：未找到有效的URL链接', 'error');
        showToast('未找到有效的URL链接', 'error');
        return;
    }
    
    if (isProcessing) {
        showToast('正在处理中，请稍候...', 'info');
        return;
    }
    
    isProcessing = true;
    batchConvertBtn.disabled = true;
    batchConvertBtn.classList.add('loading');
    batchConvertBtn.textContent = '转换中...';
    
    // 清空结果
    batchResults.innerHTML = '';
    batchResultCount.textContent = `(${urls.length}个链接)`;
    
    let successCount = 0;
    let errorCount = 0;
    
    // 更新进度条
    batchProgressFill.style.width = '0%';
    
    addLogEntry(`开始批量转换，共 ${urls.length} 个链接`, 'info');
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
            // 更新进度
            const progress = ((i + 1) / urls.length) * 100;
            batchProgressFill.style.width = `${progress}%`;
            
            // 构建转换后的URL
            const convertedUrl = buildConvertedUrl(url, true);
            
            // 创建结果卡片
            const resultCard = document.createElement('div');
            resultCard.className = 'batch-result-item';
            resultCard.innerHTML = `
                <div class="batch-result-url">${url.substring(0, 60)}${url.length > 60 ? '...' : ''}</div>
                <textarea class="batch-result-content" readonly>${convertedUrl}</textarea>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="copy-single-btn" data-url="${convertedUrl}" style="padding: 4px 8px; font-size: 12px; background: #00b09b; color: white; border: none; border-radius: 4px; cursor: pointer;">复制</button>
                    <span class="status-badge success-badge">成功</span>
                </div>
            `;
            
            batchResults.appendChild(resultCard);
            successCount++;
            
            // 保存到历史记录
            storage.saveHistory(url);
            
            // 添加延迟，避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            // 创建错误卡片
            const errorCard = document.createElement('div');
            errorCard.className = 'batch-result-item';
            errorCard.innerHTML = `
                <div class="batch-result-url">${url.substring(0, 60)}${url.length > 60 ? '...' : ''}</div>
                <div class="batch-result-content" style="color: #dc3545;">转换失败: ${error.message}</div>
                <div style="margin-top: 8px;">
                    <span class="status-badge error-badge">失败</span>
                </div>
            `;
            
            batchResults.appendChild(errorCard);
            errorCount++;
        }
    }
    
    // 添加批量复制按钮
    if (successCount > 0) {
        const allUrls = Array.from(batchResults.querySelectorAll('.batch-result-content'))
            .map(textarea => textarea.value)
            .join('\n\n');
        
        batchCopyBtn.onclick = () => handleBatchCopy(allUrls);
    }
    
    // 更新进度条为完成状态
    batchProgressFill.style.width = '100%';
    
    // 恢复按钮状态
    isProcessing = false;
    batchConvertBtn.disabled = false;
    batchConvertBtn.classList.remove('loading');
    batchConvertBtn.textContent = '批量转换';
    
    // 显示结果统计
    addLogEntry(`批量转换完成，成功: ${successCount}，失败: ${errorCount}`, 
               errorCount === 0 ? 'success' : 'warning');
    showToast(`批量转换完成，成功 ${successCount} 个，失败 ${errorCount} 个`, 
             errorCount === 0 ? 'success' : 'info');
    
    // 重置进度条
    setTimeout(() => {
        batchProgressFill.style.width = '0%';
    }, 2000);
};

/**
 * 复制处理
 */
const handleCopy = async () => {
    const convertedUrl = convertedUrlTextarea.value;
    
    if (!convertedUrl) {
        addLogEntry('复制错误：没有可复制的内容', 'error');
        showToast('没有可复制的内容', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(convertedUrl);
        addLogEntry('成功：转换结果已复制到剪贴板', 'success');
        showToast('已复制到剪贴板', 'success');
    } catch (err) {
        // 回退方案
        const textArea = document.createElement('textarea');
        textArea.value = convertedUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        addLogEntry('成功：转换结果已复制到剪贴板（使用回退方案）', 'success');
        showToast('已复制到剪贴板', 'success');
    }
};

/**
 * 批量复制处理
 */
const handleBatchCopy = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        addLogEntry('成功：批量转换结果已复制到剪贴板', 'success');
        showToast('批量结果已复制', 'success');
    } catch (err) {
        addLogEntry('批量复制失败', 'error');
        showToast('复制失败', 'error');
    }
};

/**
 * 导出配置处理
 */
const handleExport = () => {
    const originalUrl = originalUrlInput.value;
    const convertedUrl = convertedUrlTextarea.value;
    
    if (!convertedUrl) {
        showToast('没有可导出的内容', 'error');
        return;
    }
    
    const config = {
        originalUrl,
        convertedUrl,
        config: {
            emoji: emojiCheckbox.checked,
            udp: udpCheckbox.checked,
            tfo: tfoCheckbox.checked,
            xudp: xudpCheckbox.checked,
            scv: scvCheckbox.checked,
            template: configTemplateSelect.value,
            templateName: configTemplateSelect.options[configTemplateSelect.selectedIndex].text,
            customConfigUrl: customConfigUrlInput.value
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clash-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLogEntry('配置已导出', 'success');
    showToast('配置导出成功', 'success');
};

/**
 * 导入配置处理
 */
const handleImport = () => {
    importFileInput.click();
};

/**
 * 文件导入处理
 */
const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            
            // 应用配置
            if (config.originalUrl) {
                originalUrlInput.value = config.originalUrl;
            }
            
            if (config.convertedUrl) {
                convertedUrlTextarea.value = config.convertedUrl;
            }
            
            if (config.config) {
                const conf = config.config;
                emojiCheckbox.checked = conf.emoji || false;
                udpCheckbox.checked = conf.udp || false;
                tfoCheckbox.checked = conf.tfo || false;
                xudpCheckbox.checked = conf.xudp || false;
                scvCheckbox.checked = conf.scv || false;
                
                if (conf.template) {
                    configTemplateSelect.value = conf.template;
                }
                
                if (conf.customConfigUrl) {
                    customConfigUrlInput.value = conf.customConfigUrl;
                }
            }
            
            addLogEntry('配置导入成功', 'success');
            showToast('配置导入成功', 'success');
            
        } catch (error) {
            addLogEntry('配置导入失败: 文件格式错误', 'error');
            showToast('导入失败: 文件格式错误', 'error');
        }
    };
    
    reader.readAsText(file);
    importFileInput.value = '';
};

/**
 * 清空处理
 */
const handleClear = () => {
    originalUrlInput.value = '';
    convertedUrlTextarea.value = '';
    resultStats.innerHTML = '';
    progressFill.style.width = '0%';
    addLogEntry('输入内容已清空', 'info');
    showToast('已清空', 'info');
    originalUrlInput.focus();
};

/**
 * 批量清空处理
 */
const handleBatchClear = () => {
    batchUrlsTextarea.value = '';
    batchResults.innerHTML = '';
    batchResultCount.textContent = '';
    batchProgressFill.style.width = '0%';
    addLogEntry('批量输入已清空', 'info');
    showToast('批量输入已清空', 'info');
};

/**
 * 清空日志处理
 */
const handleClearLog = () => {
    logContent.innerHTML = '<div class="log-entry info">日志已清空</div>';
    addLogEntry('日志已清空', 'info');
};

/**
 * 切换日志显示
 */
const handleToggleLog = () => {
    isLogCollapsed = !isLogCollapsed;
    toggleLogBtn.textContent = isLogCollapsed ? '展开' : '折叠';
    
    if (isLogCollapsed) {
        logContent.style.height = '0';
        logContent.style.padding = '0';
    } else {
        logContent.style.height = '150px';
        logContent.style.padding = '15px';
    }
};

/**
 * 显示历史记录下拉框
 */
const showHistoryDropdown = () => {
    const history = storage.getHistory();
    
    if (history.length === 0) {
        historyDropdown.innerHTML = '<div class="history-item">暂无历史记录</div>';
        historyDropdown.style.display = 'block';
        return;
    }
    
    historyDropdown.innerHTML = '';
    
    history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = item.url.substring(0, 50) + (item.url.length > 50 ? '...' : '');
        historyItem.title = item.url;
        
        historyItem.addEventListener('click', () => {
            originalUrlInput.value = item.url;
            historyDropdown.style.display = 'none';
            originalUrlInput.focus();
        });
        
        historyDropdown.appendChild(historyItem);
    });
    
    const clearItem = document.createElement('div');
    clearItem.className = 'history-clear';
    clearItem.textContent = '清空历史记录';
    clearItem.addEventListener('click', (e) => {
        e.stopPropagation();
        storage.clearHistory();
        historyDropdown.style.display = 'none';
    });
    
    historyDropdown.appendChild(clearItem);
    historyDropdown.style.display = 'block';
};

/**
 * 切换标签页
 */
const handleTabSwitch = (tabId) => {
    // 移除所有active类
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 激活选中的标签页
    const selectedTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const selectedContent = $(`${tabId}-tab`);
    
    if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
    }
};

// ==================== 事件监听器 ====================

/**
 * 初始化事件监听器
 */
const initEventListeners = () => {
    // 单链接转换事件
    convertBtn.addEventListener('click', handleConvert);
    copyBtn.addEventListener('click', handleCopy);
    exportBtn.addEventListener('click', handleExport);
    clearBtn.addEventListener('click', handleClear);
    
    // 批量转换事件
    batchConvertBtn.addEventListener('click', handleBatchConvert);
    batchClearBtn.addEventListener('click', handleBatchClear);
    
    // 配置管理事件
    importBtn.addEventListener('click', handleImport);
    exportConfigBtn.addEventListener('click', handleExport);
    clearHistoryBtn.addEventListener('click', storage.clearHistory);
    importFileInput.addEventListener('change', handleFileImport);
    
    // 日志事件
    clearLogBtn.addEventListener('click', handleClearLog);
    toggleLogBtn.addEventListener('click', handleToggleLog);
    
    // 历史记录事件
    originalUrlInput.addEventListener('focus', showHistoryDropdown);
    originalUrlInput.addEventListener('input', debounce(() => {
        if (originalUrlInput.value.trim()) {
            showHistoryDropdown();
        } else {
            historyDropdown.style.display = 'none';
        }
    }, 300));
    
    document.addEventListener('click', (e) => {
        if (!originalUrlInput.contains(e.target) && !historyDropdown.contains(e.target)) {
            historyDropdown.style.display = 'none';
        }
    });
    
    // 标签页切换事件
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            handleTabSwitch(tabId);
            addLogEntry(`切换到 ${tab.textContent} 标签`, 'info');
        });
    });
    
    // 回车键转换
    originalUrlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleConvert();
        }
    });
    
    // 点击批量结果中的复制按钮
    batchResults.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-single-btn')) {
            const url = e.target.getAttribute('data-url');
            navigator.clipboard.writeText(url).then(() => {
                showToast('单个结果已复制', 'success');
            });
        }
    });
};

// ==================== 初始化 ====================

/**
 * 应用保存的配置
 */
const applySavedConfig = () => {
    const savedConfig = storage.loadConfig();
    if (savedConfig.template) {
        configTemplateSelect.value = savedConfig.template;
    }
    
    if (savedConfig.customConfigUrl) {
        customConfigUrlInput.value = savedConfig.customConfigUrl;
    }
    
    // 保存配置变更
    configTemplateSelect.addEventListener('change', () => {
        const templateName = configTemplateSelect.options[configTemplateSelect.selectedIndex].text;
        addLogEntry(`切换到 ${templateName} 模板`, 'info');
        
        storage.saveConfig({
            template: configTemplateSelect.value,
            customConfigUrl: customConfigUrlInput.value
        });
    });
    
    customConfigUrlInput.addEventListener('input', debounce(() => {
        storage.saveConfig({
            template: configTemplateSelect.value,
            customConfigUrl: customConfigUrlInput.value
        });
    }, 500));
};

/**
 * 初始化函数
 */
const init = () => {
    // 更新时间显示
    updateTime();
    setInterval(updateTime, 1000);
    
    // 加载历史记录
    storage.updateHistoryDisplay();
    
    // 应用保存的配置
    applySavedConfig();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 添加欢迎日志
    addLogEntry('系统初始化完成', 'success');
    addLogEntry('提示：支持单链接转换、批量处理、参数自定义', 'info');
    addLogEntry('模板说明：', 'info');
    addLogEntry('  - 默认模板: ACL4SSR Online (基础规则)', 'info');
    addLogEntry('  - 极简模板: ACL4SSR Mini (精简规则)', 'info');
    addLogEntry('  - 完整模板: ACL4SSR Full (完整规则)', 'info');
};

// 启动初始化
document.addEventListener('DOMContentLoaded', init);
