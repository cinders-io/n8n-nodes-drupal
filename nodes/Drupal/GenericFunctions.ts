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

// Simple in-memory cache for CSRF tokens during a single workflow execution.
// Keyed by baseUrl + username (safe enough for runtime; not persisted).
const csrfTokenCache = new Map<string, string>();

function normalizeBaseUrl(input: string): string {
	let url = (input ?? '').trim();
	if (!/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}
	return url.replace(/\/+$/, '');
}

async function ensureDrupalSessionAndCsrf(this: ThisCtx, baseUrl: string, jar: any): Promise<string> {
	const creds = (await this.getCredentials('drupalApi')) as IDataObject;

	// These property names depend on how your credential is defined.
	// Common patterns are: username/password OR user/pass OR email/password.
	const username =
		(creds.username as string) ??
		(creds.user as string) ??
		(creds.email as string) ??
		'';
	const password =
		(creds.password as string) ??
		(creds.pass as string) ??
		'';

	if (!username || !password) {
		throw new Error(
			'Session auth requires username/password in the Drupal API credentials.',
		);
	}

	const cacheKey = `${baseUrl}::${username}`;
	const cached = csrfTokenCache.get(cacheKey);
	if (cached) return cached;

	// Login to get session cookie
	await this.helpers.httpRequest.call(this, {
		method: 'POST',
		url: `${baseUrl}/user/login?_format=json`,
		json: true,
		body: { name: username, pass: password },
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		jar,
	} as any);

	// Fetch CSRF token (required for PATCH/POST/DELETE with session cookies)
	const token = await this.helpers.httpRequest.call(this, {
		method: 'GET',
		url: `${baseUrl}/session/token`,
		json: false,
		jar,
	} as any);

	const csrf = (typeof token === 'string' ? token : String(token)).trim();
	csrfTokenCache.set(cacheKey, csrf);
	return csrf;
}

export async function drupalApiRequest(
	this: ThisCtx,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: IDataObject = {},
) {
	const creds = (await this.getCredentials('drupalApi')) as IDataObject;

	const baseUrl = normalizeBaseUrl(String(creds.baseUrl ?? ''));
	const allowUnauthorized = Boolean(creds.allowUnauthorized);
	const authMethod = String(creds.authMethod ?? 'basic');

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
		if (authMethod === 'session') {
			// Persist cookies across the login/token/request sequence.
			// n8n provides request.jar(), fall back to jar: true.
			const jar = (this.helpers as any).request?.jar ? (this.helpers as any).request.jar() : true;

			// For unsafe methods, ensure CSRF token and attach it.
			if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase())) {
				const csrf = await ensureDrupalSessionAndCsrf.call(this, baseUrl, jar);
				(requestOptions.headers as IDataObject)['X-CSRF-Token'] = csrf;
			}

			(requestOptions as any).jar = jar;

			// Use plain httpRequest, not httpRequestWithAuthentication,
			// so no Authorization header is involved.
			return await this.helpers.httpRequest.call(this, { ...(requestOptions as any), ...options } as any);
		}

		// Default: basic
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'drupalApi',
			{ ...requestOptions, ...options },
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
