import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type IDataObject,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import { drupalApiRequest, buildJsonApiPath } from './GenericFunctions';

export class Drupal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Drupal',
		name: 'drupal',
		icon: { light: 'file:drupal.svg', dark: 'file:drupal.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resourceType"]}}',
		description: 'Interact with Drupal JSON:API generically',
		defaults: {
			name: 'Drupal',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'drupalApi', required: true }],

		properties: [
			// Generic JSON:API CRUD — one resource type string drives everything
			{
				displayName: 'Resource Type',
				name: 'resourceType',
				type: 'string',
				required: true,
				default: 'node--page',
				description:
					'JSON:API resource type (e.g., "node--page", "taxonomy_term--tags", "user--user")',
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
				type: 'json',
				default: {},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				description: 'JSON of attributes for JSON:API create/update',
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

	// ---------------------------------------------------------------------
	// execute()
	// ---------------------------------------------------------------------
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resourceType = this.getNodeParameter('resourceType', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			let response;

			// -------------------------------------
			// GET
			// -------------------------------------
			if (operation === 'get') {
				const id = this.getNodeParameter('id', i) as string;
				const query = (this.getNodeParameter('query', i) as IDataObject) ?? {};
				const path = buildJsonApiPath(resourceType, id);

				response = await drupalApiRequest.call(this, 'GET', path, {}, query);
			}

			// -------------------------------------
			// GET MANY
			// -------------------------------------
			else if (operation === 'getAll') {
				const limit = this.getNodeParameter('limit', i, 50) as number;
				const query = (this.getNodeParameter('query', i) as IDataObject) ?? {};
				const path = buildJsonApiPath(resourceType);

				const qs = { ...query, 'page[limit]': limit };

				response = await drupalApiRequest.call(this, 'GET', path, {}, qs);
			}

			// -------------------------------------
			// CREATE
			// -------------------------------------
			else if (operation === 'create') {
				const attributes = this.getNodeParameter('attributesJson', i) as IDataObject;
				const path = buildJsonApiPath(resourceType);

				const body = {
					data: {
						type: resourceType,
						attributes,
					},
				};

				response = await drupalApiRequest.call(this, 'POST', path, body);
			}

			// -------------------------------------
			// UPDATE
			// -------------------------------------
			else if (operation === 'update') {
				const id = this.getNodeParameter('id', i) as string;
				const attributes = this.getNodeParameter('attributesJson', i) as IDataObject;
				const path = buildJsonApiPath(resourceType, id);

				const body = {
					data: {
						type: resourceType,
						id,
						attributes,
					},
				};

				response = await drupalApiRequest.call(this, 'PATCH', path, body);
			}

			// -------------------------------------
			// DELETE
			// -------------------------------------
			else if (operation === 'delete') {
				const id = this.getNodeParameter('id', i) as string;
				const path = buildJsonApiPath(resourceType, id);

				await drupalApiRequest.call(this, 'DELETE', path);
				response = { success: true, id };
			}

			// -------------------------------------
			// Unsupported
			// -------------------------------------
			else {
				throw new NodeOperationError(
					this.getNode(),
					`Unsupported operation: ${operation}`,
				);
			}

			returnData.push({ json: response ?? {} });
		}

		return this.prepareOutputData(returnData);
	}
}
