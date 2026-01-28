
import { ActionId, AddItemContext, createArcFunction, OrderPriceOverrideData } from "./arcTypes/index";
import { platformApplicationsInstallImplementation } from "./platformInstall";

const Client = require('mozu-node-sdk/client');
const constants = Client.constants;
const orderDataFactory = Client.sub({
    getOrderData: Client.method({
        method: constants.verbs.GET,
        url: '{+tenantPod}api/commerce/orders/{orderId}/data',
    })
});


const addItemBefore = createArcFunction(
  ActionId["http.commerce.orders.addItem.before"],
  async function (context: AddItemContext, callback: (errorMessage?: string) => void) {
    try{
      const isAdminInteraction = context.apiContext?.callChain && context.apiContext?.callChain?.includes('MozuAdmin')
      const body = context.request?.body
      const variationProductCode = body?.product?.variationProductCode
      const productCode = body?.product?.productCode
      const warrantyPlu = body?.product?.options?.find((o) => o?.attributeFQN?.toLowerCase() == "tenant~warrantytype".toLowerCase())?.value
      const namespace = context.apiContext?.appKey?.split('.')[0]
      console.log({warrantyPlu, isAdminInteraction })
      const orderId = context.request.params?.orderId || ""
      
      // console.log({orderId})
      if(warrantyPlu && isAdminInteraction){
        const storefrontProductResource = require('mozu-node-sdk/clients/commerce/catalog/storefront/product')()
        storefrontProductResource.context['user-claims'] = null
  
        const entityResource = require('mozu-node-sdk/clients/platform/entityLists/entity')()
        entityResource.context['user-claims']= null

        const orderDataResource = orderDataFactory()
        orderDataResource.context['user-claims']= null
        
        let product;
        
        if(variationProductCode){
          product = await storefrontProductResource.getProduct({productCode,variationProductCode})
        } else {
          product = await storefrontProductResource.getProduct({productCode})
        }
          
        const entity = await entityResource.getEntity({entityListFullName: `warrantypricing@${namespace}`, id: warrantyPlu})
  
        if (entity){
          let orderData: OrderPriceOverrideData | undefined;

          try{
            orderData = await orderDataResource.getOrderData({orderId: orderId})
          }catch(e:any){
            console.error("Could not retrieve order data:", e?.errorCode || "NOT FOUND");
          }
          let productPrice = product.price.salePrice ? product.price.salePrice : product.price.price;

          // Check for price overrides in orderData
          if (orderData?.overridePrice && Array.isArray(orderData.overridePrice)) {
            let overrideFound = false;

            // First, try to match by variationProductCode if it exists
            if (variationProductCode) {
              const variationOverride = orderData.overridePrice.find(
                (override) => override.productCode === variationProductCode
              );
              if (variationOverride) {
                productPrice = variationOverride.overridePrice;
                overrideFound = true;
              }
            }

            // If no variationProductCode match found, try productCode
            if (!overrideFound && productCode) {
              const productOverride = orderData.overridePrice.find(
                (override) => override.productCode === productCode
              );
              if (productOverride) {
                productPrice = productOverride.overridePrice;
              }
            }
          }

          productPrice = formatToFixedTwo(productPrice)
          const {finalPriceWithWarranty, warrantyPrice} = calculateFinalPrice(productPrice, entity)
    
          const price = {
            "tenantOverridePrice": finalPriceWithWarranty,
            "isOverRidePriceSalePrice": true

          }

          const data: any = body.data || {}
          data.warrantyRetailPrice = warrantyPrice.toString()

          body.data = data
          body.product!.price = price
    
          context.request.body = body
        } else {
          console.error(`No entity found for PLU ${warrantyPlu} in list warrantypricing@${namespace}`);
        }
        
  
      }

    }catch(e){
      console.error("Error in addItemBefore function:", e);
    } finally {
      callback();
    }
    }
);

const platformApplicationsInstall = createArcFunction(
  ActionId["embedded.platform.applications.install"],
  function (context: any, callback: (errorMessage?: string) => void) {
    console.log("platformApplicationsInstall");
    platformApplicationsInstallImplementation(context, callback).then(() => {
      callback()
    })
  }
);

export default {
  "http.commerce.orders.addItem.before": addItemBefore,
  "embedded.platform.applications.install": platformApplicationsInstall,
}


interface PriceRange {
  fromAmount: number;
  toAmount: number;
  retailPrice: number;
}

interface WarrantyData {
  prices: PriceRange[];
}

/**
 * Calculates the final price and identifies the warranty cost.
 *
 * This function iterates through an array of warranty price ranges to find a match
 * for the input price. It returns an object containing both the final calculated
 * price and the cost of the warranty.
 *
 * @param priceInput The price of the product to check against the ranges.
 * @param data The data object containing the warranty prices.
 * @returns An object with the final calculated price
 * and the warranty price (0 if no match is found).
 */
function calculateFinalPrice(
  priceInput: number,
  data: WarrantyData,
): { finalPriceWithWarranty: number; warrantyPrice: number } {
  if (!data || !Array.isArray(data.prices)) {
    console.error("Invalid data object. It must contain a 'prices' array.");
    return {
      finalPriceWithWarranty: priceInput,
      warrantyPrice: 0,
    };
  }

  for (const priceRange of data.prices) {
    if (priceInput >= priceRange.fromAmount && priceInput <= priceRange.toAmount) {
      const finalPriceWithWarranty = priceInput + priceRange.retailPrice;
      const warrantyPrice = priceRange.retailPrice;
      console.log(`Found a matching price range for $${priceInput}.`);
      console.log(`Adding retail price of $${warrantyPrice}.`);
      return { finalPriceWithWarranty, warrantyPrice };
    }
  }

  console.log(`No matching price range found for $${priceInput}. Returning original price.`);
  return {
    finalPriceWithWarranty: priceInput,
    warrantyPrice: 0,
  };
}

export function formatToFixedTwo(value: string | number): number {
  // First, ensure the value is treated as a number.
  // parseFloat can handle both string and number types (by converting the number to a string first).
  const numericValue = parseFloat(String(value));

  // Check if the conversion was successful. If not, return NaN.
  if (isNaN(numericValue)) {
    return NaN;
  }

  // Use toFixed(2) to format the number to two decimal places.
  // This returns a string, so we need to convert it back to a number.
  const formattedString = numericValue.toFixed(2);

  // Convert the formatted string back to a number before returning.
  return parseFloat(formattedString);
}
