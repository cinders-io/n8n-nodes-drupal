"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drupalApiRequest = drupalApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
async function drupalApiRequest(method, path, body = {}, qs = {}, options = {}) {
    const { baseUrl, allowUnauthorized } = await this.getCredentials('drupalApi');
    const requestOptions = {
        method,
        url: `${baseUrl}${path}`,
        json: true,
        qs,
        body,
        headers: {
            Accept: 'application/vnd.api+json, application/json',
            'Content-Type': 'application/vnd.api+json',
            'User-Agent': 'n8n-drupal-node',
        },
        rejectUnauthorized: !(allowUnauthorized === true),
    };
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'drupalApi', { ...requestOptions, ...options });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map