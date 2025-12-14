import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class DrupalApi implements ICredentialType {
	name = 'drupalApi';
	displayName = 'Drupal API';
	icon: Icon = 'file:drupal.svg';

	// Link to your community node's README
	documentationUrl = 'https://github.com/cinders-io/n8n-nodes-drupal';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
			description: 'Your Drupal site base URL (no trailing slash).',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
            displayName: 'Authentication Method',
            name: 'authMethod',
            type: 'options',
            default: 'basic',
            options: [
                { name: 'Basic Auth (Authorization header)', value: 'basic' },
                { name: 'Drupal Session (cookie) + CSRF token', value: 'session' },
            ],
            description: 'Use Session+CSRF if your hosting/proxy strips the Authorization header (common with PaaS/proxies).',
        },
		{
			displayName: 'Allow Unauthorized SSL Certs',
			name: 'allowUnauthorized',
			type: 'boolean',
			default: false,
			description: 'Enable only for local/self-signed HTTPS during testing.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.baseUrl}}/jsonapi',
			ignoreHttpStatusErrors: false,
			returnFullResponse: false,
			// n8n maps this to the underlying request library:
			// @ts-expect-error - supported by n8n runtime
			rejectUnauthorized: '={{!$credentials.allowUnauthorized}}',
		},
	};
}
