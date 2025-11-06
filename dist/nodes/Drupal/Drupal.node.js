"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drupal = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const n8n_workflow_2 = require("n8n-workflow");
const user_1 = require("./resources/user");
const GenericFunctions_1 = require("./GenericFunctions");
function resourceToCollectionPath(resource) {
    switch (resource) {
        case 'user':
            return '/jsonapi/user/user';
        default:
            return `/jsonapi/${resource}/${resource}`;
    }
}
function resourceToItemPath(resource, id) {
    return `${resourceToCollectionPath(resource)}/${id}`;
}
class Drupal {
    constructor() {
        this.description = {
            displayName: 'Drupal',
            name: 'drupal',
            icon: { light: 'file:drupal.svg', dark: 'file:drupal.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Interact with the Drupal API',
            defaults: {
                name: 'Drupal',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [{ name: 'drupalApi', required: true }],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'User',
                            value: 'user',
                        },
                    ],
                    default: 'user',
                },
                ...user_1.userDescription,
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const resource = this.getNodeParameter('resource', i);
            const operation = this.getNodeParameter('operation', i);
            if (operation === 'get') {
                const id = this.getNodeParameter('id', i);
                const path = resourceToItemPath(resource, id);
                const res = (await GenericFunctions_1.drupalApiRequest.call(this, 'GET', path));
                returnData.push({ json: res !== null && res !== void 0 ? res : {} });
            }
            else if (operation === 'getAll') {
                const limit = this.getNodeParameter('limit', i, 50);
                const path = resourceToCollectionPath(resource);
                const qs = { 'page[limit]': limit };
                const res = (await GenericFunctions_1.drupalApiRequest.call(this, 'GET', path, {}, qs));
                returnData.push({ json: res !== null && res !== void 0 ? res : {} });
            }
            else {
                throw new n8n_workflow_2.NodeOperationError(this.getNode(), `Operation "${operation}" on resource "${resource}" is not implemented.`);
            }
        }
        return this.prepareOutputData(returnData);
    }
}
exports.Drupal = Drupal;
//# sourceMappingURL=Drupal.node.js.map