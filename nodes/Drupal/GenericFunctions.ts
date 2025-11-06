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

export async function drupalApiRequest(
	this: ThisCtx,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: IDataObject = {},
): Promise<unknown> {
	const { baseUrl, allowUnauthorized } = await this.getCredentials('drupalApi') as {
		baseUrl: string;
		allowUnauthorized?: boolean;
	};

	const requestOptions: IHttpRequestOptions = {
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
		// @ts-expect-error - supported by n8n runtime
		rejectUnauthorized: !(allowUnauthorized === true),
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
