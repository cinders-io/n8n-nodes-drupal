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

	// Shown in n8n's UI
	icon: Icon = 'file:drupal.svg';

	// Link to your community node's README
	documentationUrl = 'https://github.com/org/-drupal?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
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
			baseURL: 'https://example.com/jsonapi',
			url: '/v1/user',
		},
	};
}
