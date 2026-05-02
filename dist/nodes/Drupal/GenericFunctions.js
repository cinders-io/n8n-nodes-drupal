"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildJsonApiPath = buildJsonApiPath;
exports.drupalApiRequest = drupalApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
function getAuthenticationMethod(ctx) {
    if ('getCurrentNodeParameter' in ctx) {
        const authValue = ctx.getCurrentNodeParameter('authentication');
        return authValue === 'oAuth2' ? 'oAuth2' : 'basicAuth';
    }
    const authValue = ctx.getNodeParameter('authentication', 0, 'basicAuth');
    return authValue === 'oAuth2' ? 'oAuth2' : 'basicAuth';
}
function getCredentialName(authentication) {
    return authentication === 'oAuth2' ? 'drupalOAuth2Api' : 'drupalApi';
}
function asObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function parseJsonObjectString(value) {
    if (typeof value !== 'string')
        return undefined;
    try {
        const parsed = JSON.parse(value);
        return asObject(parsed);
    }
    catch {
        return undefined;
    }
}
function extractDrupalErrorDescription(error) {
    var _a, _b, _c, _d, _e;
    const root = asObject(error);
    if (!root)
        return undefined;
    const response = asObject(root.response);
    const responseBody = (_e = (_d = (_c = (_b = (_a = asObject(response === null || response === void 0 ? void 0 : response.body)) !== null && _a !== void 0 ? _a : asObject(response === null || response === void 0 ? void 0 : response.data)) !== null && _b !== void 0 ? _b : parseJsonObjectString(response === null || response === void 0 ? void 0 : response.body)) !== null && _c !== void 0 ? _c : parseJsonObjectString(response === null || response === void 0 ? void 0 : response.data)) !== null && _d !== void 0 ? _d : parseJsonObjectString(root.error)) !== null && _e !== void 0 ? _e : parseJsonObjectString(root.message);
    const errorsValue = responseBody === null || responseBody === void 0 ? void 0 : responseBody.errors;
    if (Array.isArray(errorsValue) && errorsValue.length > 0) {
        const details = errorsValue
            .map((entry) => {
            const errorEntry = asObject(entry);
            if (!errorEntry)
                return undefined;
            const detail = typeof errorEntry.detail === 'string' ? errorEntry.detail : undefined;
            const title = typeof errorEntry.title === 'string' ? errorEntry.title : undefined;
            const source = asObject(errorEntry.source);
            const pointer = typeof (source === null || source === void 0 ? void 0 : source.pointer) === 'string' ? source.pointer : undefined;
            if (detail && pointer)
                return `${detail} (${pointer})`;
            return detail !== null && detail !== void 0 ? detail : title;
        })
            .filter((value) => typeof value === 'string' && value.length > 0);
        if (details.length > 0) {
            return details.join(' | ');
        }
    }
    if (typeof (responseBody === null || responseBody === void 0 ? void 0 : responseBody.message) === 'string')
        return responseBody.message;
    if (typeof root.message === 'string')
        return root.message;
    return undefined;
}
function extractHttpCode(error) {
    var _a, _b, _c;
    const root = asObject(error);
    if (!root)
        return undefined;
    const response = asObject(root.response);
    const status = (_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.statusCode) !== null && _a !== void 0 ? _a : response === null || response === void 0 ? void 0 : response.status) !== null && _b !== void 0 ? _b : root.statusCode) !== null && _c !== void 0 ? _c : root.status;
    if (typeof status === 'number')
        return String(status);
    if (typeof status === 'string')
        return status;
    return undefined;
}
function buildJsonApiPath(resourceType, id) {
    const [entityTypeId, bundle] = resourceType.split('--');
    const base = `/jsonapi/${entityTypeId}/${bundle}`;
    return id ? `${base}/${id}` : base;
}
async function drupalApiRequest(method, path, body = {}, qs = {}, options = {}) {
    const authentication = getAuthenticationMethod(this);
    const credentialName = getCredentialName(authentication);
    const { baseUrl, allowUnauthorized } = (await this.getCredentials(credentialName));
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
        return await this.helpers.httpRequestWithAuthentication.call(this, credentialName, { ...requestOptions, ...options });
    }
    catch (error) {
        const description = extractDrupalErrorDescription(error);
        const httpCode = extractHttpCode(error);
        const message = httpCode === '422' ? 'Drupal rejected the request payload' : undefined;
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, {
            description,
            httpCode,
            message,
        });
    }
}
//# sourceMappingURL=GenericFunctions.js.map