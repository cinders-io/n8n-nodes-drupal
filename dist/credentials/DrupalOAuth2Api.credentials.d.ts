import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class DrupalOAuth2Api implements ICredentialType {
    name: string;
    displayName: string;
    icon: Icon;
    extends: string[];
    documentationUrl: string;
    properties: INodeProperties[];
}
