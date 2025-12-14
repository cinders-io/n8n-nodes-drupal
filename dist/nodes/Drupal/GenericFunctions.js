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
async function drupalApiRequest(method, path, body = {}, qs = {}, options = {}) {
    const { baseUrl, allowUnauthorized } = (await this.getCredentials('drupalApi'));
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
        return await this.helpers.httpRequestWithAuthentication.call(this, 'drupalApi', { ...requestOptions, ...options });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map