import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import { drupalApiRequest, buildJsonApiPath } from './GenericFunctions';

export class Drupal implements INodeType {
	/**
	 * Dynamic methods (loadOptions for entity types / bundles)
	 */
	methods = {
		loadOptions: {
			/**
			 * Load all JSON:API entity types (node, media, taxonomy_term, user, etc.)
			 * by inspecting /jsonapi links like "node--page", "media--image".
			 */
			async getEntityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = (await drupalApiRequest.call(this, 'GET', '/jsonapi')) as IDataObject;
				const links = (data.links ?? {}) as IDataObject;

				const types = new Set<string>();

				for (const key of Object.keys(links)) {
					// Keys we care about look like "node--page", "media--image"
					if (!key.includes('--')) continue;
					const [entityTypeId] = key.split('--');
					if (entityTypeId) {
						types.add(entityTypeId);
					}
				}

				const options: INodePropertyOptions[] = Array.from(types)
					.sort()
					.map((entityTypeId) => ({
						name: entityTypeId,
						value: entityTypeId,
					}));

				return options;
			},

			/**
			 * Load bundles for the currently selected entity type
			 * from /jsonapi links, using meta.label where available.
			 */
			async getBundles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entityTypeId = this.getCurrentNodeParameter('entityTypeId') as string;
				if (!entityTypeId) {
					return [];
				}

				const data = (await drupalApiRequest.call(this, 'GET', '/jsonapi')) as IDataObject;
				const links = (data.links ?? {}) as IDataObject;

				const bundles: INodePropertyOptions[] = [];

				for (const key of Object.keys(links)) {
					if (!key.includes('--')) continue;

					const [type, bundle] = key.split('--');
					if (type !== entityTypeId || !bundle) continue;

					const linkEntry = (links[key] ?? {}) as IDataObject;
					const meta = (linkEntry.meta ?? {}) as IDataObject;
					const label = (meta.label as string | undefined) ?? bundle;

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

	description: INodeTypeDescription = {
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'drupalApi', required: true }],

		properties: [
			// Entity Type / Bundle (driven by JSON:API /jsonapi index)
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
			// Operation
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
			// Shared params
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

	/**
	 * execute()
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const entityTypeId = this.getNodeParameter('entityTypeId', i) as string;
			const bundle = this.getNodeParameter('bundle', i) as string;
			const resourceType = `${entityTypeId}--${bundle}`;

			const operation = this.getNodeParameter('operation', i) as string;

			let response;

			// GET
			if (operation === 'get') {
				const id = this.getNodeParameter('id', i) as string;
				const query = (this.getNodeParameter('query', i) as IDataObject) ?? {};
				const path = buildJsonApiPath(resourceType, id);

				response = await drupalApiRequest.call(this, 'GET', path, {}, query);
			}

			// GET MANY
			else if (operation === 'getAll') {
				const limit = this.getNodeParameter('limit', i, 50) as number;
				const query = (this.getNodeParameter('query', i) as IDataObject) ?? {};
				const path = buildJsonApiPath(resourceType);

				const qs = { ...query, 'page[limit]': limit };

				response = await drupalApiRequest.call(this, 'GET', path, {}, qs);
			}

			// CREATE
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

			// UPDATE
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

			// DELETE
			else if (operation === 'delete') {
				const id = this.getNodeParameter('id', i) as string;
				const path = buildJsonApiPath(resourceType, id);

				await drupalApiRequest.call(this, 'DELETE', path);
				response = { success: true, id };
			}

			// Unsupported
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
