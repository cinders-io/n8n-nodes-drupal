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

type CookieJarLike = unknown;

type DrupalLoginResponse = {
	csrf_token?: string;
	current_user?: {
		uid?: string;
		name?: string;
		roles?: string[];
	};
	logout_token?: string;
};

type HttpRequestOptionsWithJar = IHttpRequestOptions & {
	jar?: CookieJarLike;
	// n8n supports this at runtime even if typings don’t include it
	rejectUnauthorized?: boolean;
};

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

async function ensureDrupalSessionAndCsrf(
	this: ThisCtx,
	baseUrl: string,
	jar: CookieJarLike,
	allowUnauthorized: boolean,
): Promise<string> {
	const creds = (await this.getCredentials('drupalApi')) as IDataObject;

	const username = String(creds.username ?? '').trim();
	const password = String(creds.password ?? '').trim();

	if (!username || !password) {
		throw new Error('Session auth requires username/password in the Drupal API credentials.');
	}

	const cacheKey = `${baseUrl}::${username}`;
	const cached = csrfTokenCache.get(cacheKey);
	if (cached) return cached;

	const loginRequest: HttpRequestOptionsWithJar = {
		method: 'POST',
		url: `${baseUrl}/user/login?_format=json`,
		json: true,
		body: { name: username, pass: password },
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		jar,
		rejectUnauthorized: !allowUnauthorized,
	};

	const loginResponse = (await this.helpers.httpRequest.call(
		this,
		loginRequest,
	)) as unknown as DrupalLoginResponse;

	const csrf = String(loginResponse.csrf_token ?? '').trim();
	if (!csrf) {
		throw new Error('Login succeeded but no csrf_token was returned.');
	}

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
			const helpersWithRequest = this.helpers as unknown as { request?: { jar?: () => CookieJarLike } };
			const jar = helpersWithRequest.request?.jar
				? helpersWithRequest.request.jar()
				: (true as unknown as CookieJarLike);

			if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase())) {
				const csrf = await ensureDrupalSessionAndCsrf.call(this, baseUrl, jar, allowUnauthorized);
				(requestOptions.headers as IDataObject)['X-CSRF-Token'] = csrf;
			}

			const reqWithJar: HttpRequestOptionsWithJar = {
				...(requestOptions as HttpRequestOptionsWithJar),
				...options,
				jar,
				rejectUnauthorized: !allowUnauthorized,
			};

			return await this.helpers.httpRequest.call(this, reqWithJar);
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
