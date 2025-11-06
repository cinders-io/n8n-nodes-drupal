import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { userDescription } from './resources/user';
import { drupalApiRequest } from './GenericFunctions';

// ---- Top-level helpers (not class methods) ----

// Helper to translate “resource” into a JSON:API collection path
// e.g., /jsonapi/user/user
function resourceToCollectionPath(resource: string): string {
	switch (resource) {
		case 'user':
			return '/jsonapi/user/user';
		default:
			return `/jsonapi/${resource}/${resource}`;
	}
}

// Helper to translate “resource” into a JSON:API single-item path by ID
// e.g., /jsonapi/user/user/{uuid}
function resourceToItemPath(resource: string, id: string): string {
	return `${resourceToCollectionPath(resource)}/${id}`;
}

export class Drupal implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
			...userDescription,
		],
	};

	// Supports `get` (by id) and `getAll` (list with page limit)
	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'get') {
				// Expect an "id" parameter in the resource description
				const id = this.getNodeParameter('id', i) as string;
				const path = resourceToItemPath(resource, id);

				const res = (await drupalApiRequest.call(this, 'GET', path)) as IDataObject;
				returnData.push({ json: res ?? {} });

			} else if (operation === 'getAll') {
				// Optionally accept a "limit" parameter and map to JSON:API paging
				const limit = this.getNodeParameter('limit', i, 50) as number;

				const path = resourceToCollectionPath(resource);
				const qs: IDataObject = { 'page[limit]': limit };

				const res = (await drupalApiRequest.call(this, 'GET', path, {}, qs)) as IDataObject;
				returnData.push({ json: res ?? {} });

			} else {
				// Not implemented yet (error)
				throw new NodeOperationError(
					this.getNode(),
					`Operation "${operation}" on resource "${resource}" is not implemented.`,
				);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
