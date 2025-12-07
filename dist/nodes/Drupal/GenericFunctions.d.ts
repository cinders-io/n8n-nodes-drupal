import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestMethods } from 'n8n-workflow';
type ThisCtx = IExecuteFunctions | ILoadOptionsFunctions;
export declare function buildJsonApiPath(resourceType: string, id?: string): string;
export declare function drupalApiRequest(this: ThisCtx, method: IHttpRequestMethods, path: string, body?: IDataObject, qs?: IDataObject, options?: IDataObject): Promise<any>;
export {};
