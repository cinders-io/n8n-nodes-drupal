"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drupal = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const n8n_workflow_2 = require("n8n-workflow");
const GenericFunctions_1 = require("./GenericFunctions");
function coerceObjectJson(ctx, value, itemIndex, fieldLabel) {
    const trimmed = (value !== null && value !== void 0 ? value : '').trim();
    if (!trimmed)
        return {};
    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    }
    catch {
        throw new n8n_workflow_2.NodeOperationError(ctx.getNode(), `${fieldLabel} must be valid JSON.`, { itemIndex });
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new n8n_workflow_2.NodeOperationError(ctx.getNode(), `${fieldLabel} must be a JSON object.`, { itemIndex });
    }
    return parsed;
}
function asDataObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function normalizeResourceObject(payload) {
    var _a;
    const dataPayload = asDataObject(payload.data);
    const source = dataPayload !== null && dataPayload !== void 0 ? dataPayload : payload;
    const explicitAttributes = asDataObject(source.attributes);
    const explicitRelationships = asDataObject(source.relationships);
    if (explicitAttributes || explicitRelationships) {
        return {
            attributes: explicitAttributes !== null && explicitAttributes !== void 0 ? explicitAttributes : {},
            relationships: explicitRelationships !== null && explicitRelationships !== void 0 ? explicitRelationships : {},
        };
    }
    const attributes = { ...source };
    const relationships = (_a = asDataObject(attributes.relationships)) !== null && _a !== void 0 ? _a : {};
    delete attributes.relationships;
    return { attributes, relationships };
}
class Drupal {
    constructor() {
        this.methods = {
            loadOptions: {
                async getEntityTypes() {
                    var _a;
                    const data = (await GenericFunctions_1.drupalApiRequest.call(this, 'GET', '/jsonapi'));
                    const links = ((_a = data.links) !== null && _a !== void 0 ? _a : {});
                    const typeBundles = new Map();
                    const singleBundleContentAllowList = new Set([
                        'file',
                        'user',
                        'comment',
                    ]);
                    for (const key of Object.keys(links)) {
                        if (!key.includes('--'))
                            continue;
                        const [entityTypeId, bundle] = key.split('--');
                        if (!entityTypeId || !bundle)
                            continue;
                        if (!typeBundles.has(entityTypeId)) {
                            typeBundles.set(entityTypeId, new Set());
                        }
                        typeBundles.get(entityTypeId).add(bundle);
                    }
                    const options = Array.from(typeBundles.entries())
                        .filter(([entityTypeId, bundles]) => {
                        if (singleBundleContentAllowList.has(entityTypeId))
                            return true;
                        if (bundles.size === 1 && bundles.has(entityTypeId))
                            return false;
                        return true;
                    })
                        .map(([entityTypeId]) => entityTypeId)
                        .sort()
                        .map((entityTypeId) => ({
                        name: entityTypeId,
                        value: entityTypeId,
                    }));
                    return options;
                },
                async getBundles() {
                    var _a, _b, _c, _d;
                    const entityTypeId = this.getCurrentNodeParameter('entityTypeId');
                    if (!entityTypeId) {
                        return [];
                    }
                    const data = (await GenericFunctions_1.drupalApiRequest.call(this, 'GET', '/jsonapi'));
                    const links = ((_a = data.links) !== null && _a !== void 0 ? _a : {});
                    const bundles = [];
                    for (const key of Object.keys(links)) {
                        if (!key.includes('--'))
                            continue;
                        const [type, bundle] = key.split('--');
                        if (type !== entityTypeId || !bundle)
                            continue;
                        const linkEntry = ((_b = links[key]) !== null && _b !== void 0 ? _b : {});
                        const meta = ((_c = linkEntry.meta) !== null && _c !== void 0 ? _c : {});
                        const label = (_d = meta.label) !== null && _d !== void 0 ? _d : bundle;
                        bundles.push({
                            name: label,
                            value: bundle,
                            description: key,
                        });
                    }
                    bundles.sort((a, b) => a.name.localeCompare(b.name));
                    return bundles;
                },
            },
        };
        this.description = {
            displayName: 'Drupal',
            name: 'drupal',
            icon: { light: 'file:drupal.svg', dark: 'file:drupal.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"] + ": " + $parameter["entityTypeId"] + "--" + $parameter["bundle"]}}',
            description: 'Interact with Drupal JSON:API generically',
            defaults: {
                name: 'Drupal',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'drupalApi',
                    required: true,
                    displayOptions: {
                        show: {
                            authentication: ['basicAuth'],
                        },
                    },
                },
                {
                    name: 'drupalOAuth2Api',
                    required: true,
                    displayOptions: {
                        show: {
                            authentication: ['oAuth2'],
                        },
                    },
                },
            ],
            properties: [
                {
                    displayName: 'Authentication',
                    name: 'authentication',
                    type: 'options',
                    options: [
                        {
                            name: 'Basic Auth',
                            value: 'basicAuth',
                        },
                        {
                            name: 'OAuth2',
                            value: 'oAuth2',
                        },
                    ],
                    default: 'basicAuth',
                },
                {
                    displayName: 'Entity Type {Entity} Name or ID',
                    name: 'entityTypeId',
                    type: 'options',
                    noDataExpression: true,
                    required: true,
                    typeOptions: {
                        loadOptionsMethod: 'getEntityTypes',
                    },
                    default: '',
                    description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                },
                {
                    displayName: 'Bundle {Entity} Name or ID',
                    name: 'bundle',
                    type: 'options',
                    noDataExpression: true,
                    required: true,
                    typeOptions: {
                        loadOptionsMethod: 'getBundles',
                        loadOptionsDependsOn: ['entityTypeId'],
                    },
                    default: '',
                    description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    default: 'get',
                    options: [
                        { name: 'Create', value: 'create' },
                        { name: 'Delete', value: 'delete' },
                        { name: 'Get', value: 'get' },
                        { name: 'Get Many', value: 'getAll' },
                        { name: 'Update', value: 'update' },
                    ],
                },
                {
                    displayName: 'UUID',
                    name: 'id',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            operation: ['get', 'update', 'delete'],
                        },
                    },
                    description: 'The entity UUID',
                },
                {
                    displayName: 'Attributes (JSON)',
                    name: 'attributesJson',
                    type: 'string',
                    typeOptions: {
                        rows: 10,
                    },
                    default: '{}',
                    displayOptions: {
                        show: {
                            operation: ['create', 'update'],
                        },
                    },
                    description: 'JSON of attributes for JSON:API create/update',
                },
                {
                    displayName: 'Relationships (JSON)',
                    name: 'relationshipsJson',
                    type: 'string',
                    typeOptions: {
                        rows: 8,
                    },
                    default: '{}',
                    displayOptions: {
                        show: {
                            operation: ['create', 'update'],
                        },
                    },
                    description: 'Optional JSON:API relationships object for entity references',
                },
                {
                    displayName: 'Query Parameters',
                    name: 'query',
                    type: 'json',
                    default: {},
                    displayOptions: {
                        show: {
                            operation: ['get', 'getAll'],
                        },
                    },
                    description: 'Filters, includes, pagination, etc',
                },
                {
                    displayName: 'Limit',
                    name: 'limit',
                    type: 'number',
                    default: 50,
                    typeOptions: {
                        minValue: 1,
                        maxValue: 100,
                    },
                    displayOptions: {
                        show: {
                            operation: ['getAll'],
                        },
                    },
                    description: 'Max number of results to return',
                },
            ],
        };
    }
    async execute() {
        var _a, _b;
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const entityTypeId = this.getNodeParameter('entityTypeId', i);
            const bundle = this.getNodeParameter('bundle', i);
            const resourceType = `${entityTypeId}--${bundle}`;
            const operation = this.getNodeParameter('operation', i);
            let response;
            if (operation === 'get') {
                const id = this.getNodeParameter('id', i);
                const query = (_a = this.getNodeParameter('query', i)) !== null && _a !== void 0 ? _a : {};
                const path = (0, GenericFunctions_1.buildJsonApiPath)(resourceType, id);
                response = await GenericFunctions_1.drupalApiRequest.call(this, 'GET', path, {}, query);
            }
            else if (operation === 'getAll') {
                const limit = this.getNodeParameter('limit', i, 50);
                const query = (_b = this.getNodeParameter('query', i)) !== null && _b !== void 0 ? _b : {};
                const path = (0, GenericFunctions_1.buildJsonApiPath)(resourceType);
                const qs = { ...query, 'page[limit]': limit };
                response = await GenericFunctions_1.drupalApiRequest.call(this, 'GET', path, {}, qs);
            }
            else if (operation === 'create') {
                const attributesJson = this.getNodeParameter('attributesJson', i);
                const relationshipsJson = this.getNodeParameter('relationshipsJson', i);
                const attributes = coerceObjectJson(this, attributesJson, i, 'Attributes (JSON)');
                const relationships = coerceObjectJson(this, relationshipsJson, i, 'Relationships (JSON)');
                const normalizedAttributesInput = normalizeResourceObject(attributes);
                const normalizedRelationshipsInput = normalizeResourceObject(relationships);
                const resolvedAttributes = {
                    ...normalizedAttributesInput.attributes,
                    ...normalizedRelationshipsInput.attributes,
                };
                const resolvedRelationships = {
                    ...normalizedAttributesInput.relationships,
                    ...normalizedRelationshipsInput.relationships,
                };
                const path = (0, GenericFunctions_1.buildJsonApiPath)(resourceType);
                const data = {
                    type: resourceType,
                    attributes: resolvedAttributes,
                };
                if (Object.keys(resolvedRelationships).length > 0) {
                    data.relationships = resolvedRelationships;
                }
                const body = {
                    data,
                };
                response = await GenericFunctions_1.drupalApiRequest.call(this, 'POST', path, body);
            }
            else if (operation === 'update') {
                const id = this.getNodeParameter('id', i);
                const attributesJson = this.getNodeParameter('attributesJson', i);
                const relationshipsJson = this.getNodeParameter('relationshipsJson', i);
                const attributes = coerceObjectJson(this, attributesJson, i, 'Attributes (JSON)');
                const relationships = coerceObjectJson(this, relationshipsJson, i, 'Relationships (JSON)');
                const normalizedAttributesInput = normalizeResourceObject(attributes);
                const normalizedRelationshipsInput = normalizeResourceObject(relationships);
                const resolvedAttributes = {
                    ...normalizedAttributesInput.attributes,
                    ...normalizedRelationshipsInput.attributes,
                };
                const resolvedRelationships = {
                    ...normalizedAttributesInput.relationships,
                    ...normalizedRelationshipsInput.relationships,
                };
                const path = (0, GenericFunctions_1.buildJsonApiPath)(resourceType, id);
                const data = {
                    type: resourceType,
                    id,
                    attributes: resolvedAttributes,
                };
                if (Object.keys(resolvedRelationships).length > 0) {
                    data.relationships = resolvedRelationships;
                }
                const body = {
                    data,
                };
                response = await GenericFunctions_1.drupalApiRequest.call(this, 'PATCH', path, body);
            }
            else if (operation === 'delete') {
                const id = this.getNodeParameter('id', i);
                const path = (0, GenericFunctions_1.buildJsonApiPath)(resourceType, id);
                await GenericFunctions_1.drupalApiRequest.call(this, 'DELETE', path);
                response = { success: true, id };
            }
            else {
                throw new n8n_workflow_2.NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
            }
            returnData.push({ json: response !== null && response !== void 0 ? response : {} });
        }
        return this.prepareOutputData(returnData);
    }
}
exports.Drupal = Drupal;
//# sourceMappingURL=Drupal.node.js.map