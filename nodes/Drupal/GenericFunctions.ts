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
type DrupalAuthentication = 'basicAuth' | 'oAuth2';
type DrupalCredentialName = 'drupalApi' | 'drupalOAuth2Api';
type PlainObject = Record<string, unknown>;

function getAuthenticationMethod(ctx: ThisCtx): DrupalAuthentication {
	if ('getCurrentNodeParameter' in ctx) {
		const authValue = ctx.getCurrentNodeParameter('authentication');
		return authValue === 'oAuth2' ? 'oAuth2' : 'basicAuth';
	}

	const authValue = ctx.getNodeParameter('authentication', 0, 'basicAuth');
	return authValue === 'oAuth2' ? 'oAuth2' : 'basicAuth';
}

function getCredentialName(authentication: DrupalAuthentication): DrupalCredentialName {
	return authentication === 'oAuth2' ? 'drupalOAuth2Api' : 'drupalApi';
}

function asObject(value: unknown): PlainObject | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}

	return value as PlainObject;
}

function parseJsonObjectString(value: unknown): PlainObject | undefined {
	if (typeof value !== 'string') return undefined;

	try {
		const parsed = JSON.parse(value) as unknown;
		return asObject(parsed);
	} catch {
		return undefined;
	}
}

function extractDrupalErrorDescription(error: unknown): string | undefined {
	const root = asObject(error);
	if (!root) return undefined;

	const response = asObject(root.response);
	const responseBody =
		asObject(response?.body) ??
		asObject(response?.data) ??
		parseJsonObjectString(response?.body) ??
		parseJsonObjectString(response?.data) ??
		parseJsonObjectString(root.error) ??
		parseJsonObjectString(root.message);

	const errorsValue = responseBody?.errors;
	if (Array.isArray(errorsValue) && errorsValue.length > 0) {
		const details = errorsValue
			.map((entry) => {
				const errorEntry = asObject(entry);
				if (!errorEntry) return undefined;

				const detail =
					typeof errorEntry.detail === 'string' ? errorEntry.detail : undefined;
				const title =
					typeof errorEntry.title === 'string' ? errorEntry.title : undefined;
				const source = asObject(errorEntry.source);
				const pointer =
					typeof source?.pointer === 'string' ? source.pointer : undefined;

				if (detail && pointer) return `${detail} (${pointer})`;
				return detail ?? title;
			})
			.filter((value): value is string => typeof value === 'string' && value.length > 0);

		if (details.length > 0) {
			return details.join(' | ');
		}
	}

	if (typeof responseBody?.message === 'string') return responseBody.message;
	if (typeof root.message === 'string') return root.message;

	return undefined;
}

function extractHttpCode(error: unknown): string | undefined {
	const root = asObject(error);
	if (!root) return undefined;

	const response = asObject(root.response);
	const status =
		response?.statusCode ??
		response?.status ??
		root.statusCode ??
		root.status;

	if (typeof status === 'number') return String(status);
	if (typeof status === 'string') return status;

	return undefined;
}

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
	const authentication = getAuthenticationMethod(this);
	const credentialName = getCredentialName(authentication);

	const { baseUrl, allowUnauthorized } = (await this.getCredentials(
		credentialName,
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
			credentialName,
			{ ...requestOptions, ...options },
		);
	} catch (error) {
		const description = extractDrupalErrorDescription(error);
		const httpCode = extractHttpCode(error);
		const message =
			httpCode === '422' ? 'Drupal rejected the request payload' : undefined;

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			description,
			httpCode,
			message,
		});
	}
}
