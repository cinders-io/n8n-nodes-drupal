"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildJsonApiPath = buildJsonApiPath;
exports.drupalApiRequest = drupalApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
function buildJsonApiPath(resourceType, id) {
    const [entityTypeId, bundle] = resourceType.split('--');
    const base = `/jsonapi/${entityTypeId}/${bundle}`;
    return id ? `${base}/${id}` : base;
}
const csrfTokenCache = new Map();
function normalizeBaseUrl(input) {
    let url = (input !== null && input !== void 0 ? input : '').trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    return url.replace(/\/+$/, '');
}
async function ensureDrupalSessionAndCsrf(baseUrl, jar, allowUnauthorized) {
    var _a, _b, _c;
    const creds = (await this.getCredentials('drupalApi'));
    const username = String((_a = creds.username) !== null && _a !== void 0 ? _a : '').trim();
    const password = String((_b = creds.password) !== null && _b !== void 0 ? _b : '').trim();
    if (!username || !password) {
        throw new Error('Session auth requires username/password in the Drupal API credentials.');
    }
    const cacheKey = `${baseUrl}::${username}`;
    const cached = csrfTokenCache.get(cacheKey);
    if (cached)
        return cached;
    const loginRequest = {
        method: 'POST',
        url: `${baseUrl}/user/login?_format=json`,
        json: true,
        body: { name: username, pass: password },
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        jar,
        rejectUnauthorized: !allowUnauthorized,
    };
    const loginResponse = (await this.helpers.httpRequest.call(this, loginRequest));
    const csrf = String((_c = loginResponse.csrf_token) !== null && _c !== void 0 ? _c : '').trim();
    if (!csrf) {
        throw new Error('Login succeeded but no csrf_token was returned.');
    }
    csrfTokenCache.set(cacheKey, csrf);
    return csrf;
}
async function drupalApiRequest(method, path, body = {}, qs = {}, options = {}) {
    var _a, _b, _c;
    const creds = (await this.getCredentials('drupalApi'));
    const baseUrl = normalizeBaseUrl(String((_a = creds.baseUrl) !== null && _a !== void 0 ? _a : ''));
    const allowUnauthorized = Boolean(creds.allowUnauthorized);
    const authMethod = String((_b = creds.authMethod) !== null && _b !== void 0 ? _b : 'basic');
    const requestOptions = {
        method,
        url: `${baseUrl}${path}`,
        json: true,
        body,
        qs,
        headers: {
            Accept: 'application/vnd.api+json, application/json',
            'Content-Type': 'application/vnd.api+json',
        },
        rejectUnauthorized: !allowUnauthorized,
    };
    try {
        if (authMethod === 'session') {
            const helpersWithRequest = this.helpers;
            const jar = ((_c = helpersWithRequest.request) === null || _c === void 0 ? void 0 : _c.jar)
                ? helpersWithRequest.request.jar()
                : true;
            if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase())) {
                const csrf = await ensureDrupalSessionAndCsrf.call(this, baseUrl, jar, allowUnauthorized);
                requestOptions.headers['X-CSRF-Token'] = csrf;
            }
            const reqWithJar = {
                ...requestOptions,
                ...options,
                jar,
                rejectUnauthorized: !allowUnauthorized,
            };
            return await this.helpers.httpRequest.call(this, reqWithJar);
        }
        return await this.helpers.httpRequestWithAuthentication.call(this, 'drupalApi', { ...requestOptions, ...options });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map