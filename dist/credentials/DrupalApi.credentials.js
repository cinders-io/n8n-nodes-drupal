"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrupalApi = void 0;
class DrupalApi {
    constructor() {
        this.name = 'drupalApi';
        this.displayName = 'Drupal API';
        this.icon = 'file:drupal.svg';
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
                displayName: 'Allow Unauthorized SSL Certs',
                name: 'allowUnauthorized',
                type: 'boolean',
                default: false,
                description: 'Enable only for local/self-signed HTTPS during testing.',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                auth: {
                    username: '={{$credentials.username}}',
                    password: '={{$credentials.password}}',
                },
            },
        };
        this.test = {
            request: {
                url: '={{$credentials.baseUrl}}/jsonapi',
                ignoreHttpStatusErrors: false,
                returnFullResponse: false,
                rejectUnauthorized: '={{!$credentials.allowUnauthorized}}',
            },
        };
    }
}
exports.DrupalApi = DrupalApi;
//# sourceMappingURL=DrupalApi.credentials.js.map