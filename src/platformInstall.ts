import { ActionId } from "./arcTypes/index";

const Client = require('mozu-node-sdk/client')

export interface ArcJSConfig {
  actions?: (ActionsEntity)[] | null;
  configurations?: (null)[] | null;
  defaultLogLevel: string;
}
export interface ActionsEntity {
  actionId: string;
  contexts?: (ContextsEntity)[] | null;
}
export interface ContextsEntity {
  customFunctions?: (CustomFunctionsEntity)[] | null;
}
export interface CustomFunctionsEntity {
  applicationKey: string;
  functionId: string;
  enabled: boolean;
  configuration: any;
}

const constants = Client.constants;
const myClientFactory = Client.sub({
  getArcConfig: Client.method({
    method: constants.verbs.GET,
    url: '{+tenantPod}api/platform/extensions'
  }),
  setArcConfig: Client.method({
    method: constants.verbs.PUT,
    url: '{+tenantPod}api/platform/extensions'
  })
}) as (context: any) => {
  getArcConfig: () => Promise<ArcJSConfig>,
  setArcConfig: (_: any, payload: { body: ArcJSConfig }) => any,
  context: any,
};

/**
 * The main implementation of the install function 
 * 
 * @param context context
 * @param callback callback
 */
export const platformApplicationsInstallImplementation = async (context: any, callback: (errorMessage?: string) => void) => {

  const myClient = myClientFactory(context)

  const arcConfig = await myClient.getArcConfig()

  try {
    const ORDERS_ADD_ITEM_BEFORE_ACTION = ActionId[ActionId["http.commerce.orders.addItem.before"]]
    const ordersAddItemContext: any = {
      customFunctions: [
        {
          applicationKey: context.apiContext.appKey,
          functionId: ORDERS_ADD_ITEM_BEFORE_ACTION,
          enabled: true,
        }
      ]
    }
    const paymentAfterAction = arcConfig.actions?.find(a => a.actionId == ORDERS_ADD_ITEM_BEFORE_ACTION)
    if (!paymentAfterAction) {
      arcConfig.actions?.push({
        actionId: ORDERS_ADD_ITEM_BEFORE_ACTION,
        contexts: [
          ordersAddItemContext
        ],
      })
    } else if (!paymentAfterAction.contexts?.some(c => c.customFunctions?.some(f => f.applicationKey == context.apiContext.appKey))) {
      paymentAfterAction.contexts?.push(ordersAddItemContext)
    }

    // Now we are all done, update the Arc config
    await myClient.setArcConfig({}, { body: arcConfig })
  } catch (err) {
    callback("There was an error installing. " + err)
    console.error(err)
  }
}
