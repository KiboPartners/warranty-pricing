/**
 * Modify this list if you need more actions
 */
export enum ActionId {
  "http.commerce.orders.addItem.before",
  "embedded.platform.applications.install",
}

import { AddressValidationRequest, AddressValidationResponse } from '@kibocommerce/rest-sdk/clients/Customer'
import { OrderItem } from '@kibocommerce/rest-sdk/clients/Commerce/'
interface ApiContext {
  baseUrl: string;
  basePciUrl: string;
  tenantPod: string;
  appClaims: string;
  appKey: string;
  tenantId: number;
  siteId: number;
  masterCatalogId: number;
  catalogId: number;
  currencyCode: string;
  previewDate: Date;
  localeCode: string;
  correlationId: string;
  isAuthorizedAsAdmin: boolean;
  userClaims: string;
  callChain: string;
}

export type AddItemContext = {
  configuration:any,
  request: {
    body: OrderItem
  },
  response: {
    status: number,
    body:OrderItem
  },
  apiContext: ApiContext
}

export interface ArcFunction {
  actionName: string;
  customFunction: (
    context: any,
    callback: (errorMessage?: string) => void
  ) => void;
}

export function createArcFunction(
  actionName: ActionId,
  customFunction: (
    context: any,
    callback: (errorMessage?: string) => void
  ) => void
): ArcFunction {
  return { actionName: ActionId[actionName], customFunction: customFunction };
}
