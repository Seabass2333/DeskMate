/**
 * API Service - HTTP 请求封装
 * v1.1: 骨架代码，暂不启用
 * v1.2: 启用后端 API 调用
 */

class ApiService {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.timeout = 30000;
    }

    /**
     * 设置 API 基础 URL
     */
    setBaseURL(url) {
        this.baseURL = url;
    }

    /**
     * GET 请求
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    /**
     * POST 请求
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    /**
     * PUT 请求
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    /**
     * DELETE 请求
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * 统一请求处理
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: options.timeout || this.timeout
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return { success: true, data: result };
        } catch (error) {
            console.error(`[ApiService] ${method} ${endpoint} failed:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 带重试的请求（指数退避）
     */
    async requestWithRetry(method, endpoint, data = null, maxRetries = 3) {
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const result = await this.request(method, endpoint, data);

            if (result.success) {
                return result;
            }

            lastError = result.error;

            // 指数退避：1s, 2s, 4s...
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[ApiService] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        return { success: false, error: lastError };
    }
}

// 单例导出
const apiService = new ApiService();

module.exports = { ApiService, apiService };
