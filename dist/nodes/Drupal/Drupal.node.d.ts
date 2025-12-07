import { type INodeType, type INodeTypeDescription, type IExecuteFunctions, type INodeExecutionData, type ILoadOptionsFunctions, type INodePropertyOptions } from 'n8n-workflow';
export declare class Drupal implements INodeType {
    methods: {
        loadOptions: {
            getEntityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getBundles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
