import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type ThisCtx = IExecuteFunctions | ILoadOptionsFunctions;

export function buildJsonApiPath(resourceType: string, id?: string): string {
	// resourceType is like "node--page"
	const [entityTypeId, bundle] = resourceType.split('--');
	const base = `/jsonapi/${entityTypeId}/${bundle}`;
	return id ? `${base}/${id}` : base;
}

export async function drupalApiRequest(
	this: ThisCtx,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: IDataObject = {},
) {
	const { baseUrl, allowUnauthorized } = (await this.getCredentials(
		'drupalApi',
	)) as {
		baseUrl: string;
		allowUnauthorized?: boolean;
	};

	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
		body,
		qs,
		headers: {
			Accept: 'application/vnd.api+json, application/json',
			'Content-Type': 'application/vnd.api+json',
		},
		// @ts-expect-error supported by n8n runtime
		rejectUnauthorized: !allowUnauthorized,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'drupalApi',
			{ ...requestOptions, ...options },
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
