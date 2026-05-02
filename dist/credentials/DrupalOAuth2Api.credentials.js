"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrupalOAuth2Api = void 0;
class DrupalOAuth2Api {
    constructor() {
        this.name = 'drupalOAuth2Api';
        this.displayName = 'Drupal OAuth2 API';
        this.icon = 'file:drupal.svg';
        this.extends = ['oAuth2Api'];
        this.documentationUrl = 'https://github.com/cinders-io/n8n-nodes-drupal';
        this.properties = [
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
                displayName: 'Grant Type',
                name: 'grantType',
                type: 'options',
                options: [
                    {
                        name: 'Client Credentials',
                        value: 'clientCredentials',
                    },
                    {
                        name: 'Authorization Code',
                        value: 'authorizationCode',
                    },
                ],
                default: 'clientCredentials',
            },
            {
                displayName: 'Authorization URL',
                name: 'authUrl',
                type: 'string',
                default: 'https://example.com/oauth/authorize',
                placeholder: 'https://example.com/oauth/authorize',
                required: true,
                displayOptions: {
                    show: {
                        grantType: ['authorizationCode'],
                    },
                },
                description: 'Usually /oauth/authorize when using Drupal Simple OAuth.',
            },
            {
                displayName: 'Access Token URL',
                name: 'accessTokenUrl',
                type: 'string',
                default: 'https://example.com/oauth/token',
                placeholder: 'https://example.com/oauth/token',
                required: true,
                description: 'Usually /oauth/token when using Drupal Simple OAuth + Consumers.',
            },
            {
                displayName: 'Auth URI Query Parameters',
                name: 'authQueryParameters',
                type: 'hidden',
                default: '',
            },
            {
                displayName: 'Scope',
                name: 'scope',
                type: 'string',
                default: '',
                description: 'Optional OAuth2 scopes, space-separated.',
            },
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Header',
                        value: 'header',
                    },
                    {
                        name: 'Body',
                        value: 'body',
                    },
                ],
                default: 'header',
                description: 'Where client credentials are sent during token exchange.',
            },
            {
                displayName: 'Allow Unauthorized SSL Certs',
                name: 'allowUnauthorized',
                type: 'boolean',
                default: false,
                description: 'Enable only for local/self-signed HTTPS during testing.',
            },
        ];
    }
}
exports.DrupalOAuth2Api = DrupalOAuth2Api;
//# sourceMappingURL=DrupalOAuth2Api.credentials.js.map