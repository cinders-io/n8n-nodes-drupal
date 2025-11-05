"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrupalApi = void 0;
class DrupalApi {
    constructor() {
        this.name = 'drupalApi';
        this.displayName = 'Drupal API';
        this.icon = 'file:drupal.svg';
        this.documentationUrl = 'https://github.com/org/-drupal?tab=readme-ov-file#credentials';
        this.properties = [
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
                baseURL: 'https://example.com/jsonapi',
                url: '/v1/user',
            },
        };
    }
}
exports.DrupalApi = DrupalApi;
//# sourceMappingURL=DrupalApi.credentials.js.map