
# Warranty Pricing 

This is a starter kit for adding dynamic warranty pricing to Standard and Configurable Products(when configured as an Extra) based on pricing band tables stored in an entity list.

This starter kit includes a base implementation. To perform a lookup on an Entity List based on the PLU of the warranty, and apply that as an `tenantOverridePrice` on the item, when creating orders through the Kibo Admin UI.

## Getting Started

The starter kit contains a simple application that demonstrates how to validate and standardize addresses using API Extensions. It includes basic validation rules and can be extended to integrate with external address validation services.

You will need to modify the code to your needs, upload the code to a new application, install the application, and then test.

## Development

First, go to `src/main.ts` and modify from there. You can customize the address validation logic or integrate with external services as needed. The function definition is asychronous, so you can use await to wait for the result.

## Install

First install the dependencies with: `npm install`

Then copy `mozu.config.json.example` into `mozu.config.json` and fill in the blank variables (Email, Dev Account ID, Application name).

Then build with `grunt`. It will run through eslint and Typescript checks, compile the code into the assets folder, and then upload to your application using mozusync as usual.

Then go to your application in Dev Center, and click Install on your tenant. This will automatically add the API Extensions in the Action Management JSON Editor.

## Tenant Configuration

1. Update the Extra Attribute name in `main.ts` 

`      const warrantyPlu = body?.product?.options?.find((o) => o?.attributeFQN?.toLowerCase() == "tenant~warrantyType".toLowerCase())?.value`

2. Setup entity list
  ```
curl --location 'https://t{{tenantID}}.{{tenantPod}}.{{zone}}.com/api/platform/entitylists' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer XXXX' \
--data '{
            "tenantId": {{tenantId}},
            "nameSpace": {{namespace}},
            "name": "warrantypricing",
            "contextLevel": "Tenant",
            "useSystemAssignedId": false,
            "idProperty": {
                "propertyName": "plu",
                "dataType": "string"
            },
            "indexA": {
                "propertyName": "plu",
                "dataType": "string"
            },
            "isVisibleInStorefront": false,
            "isLocaleSpecific": false,
            "isShopperSpecific": false,
            "isSandboxDataCloningSupported": true,
            "views": [
                {
                    "name": "Default",
                    "usages": [
                        "entityManager"
                    ],
                    "security": "public",
                    "fields": [
                        {
                            "name": "plu",
                            "type": "developerAccount",
                            "target": "string"
                        }
                    ]
                }
            ],
             "usages": [
                "entityManager"
            ],
            "createDate": "2023-07-12T13:11:14.450Z",
            "updateDate": "2023-07-12T13:11:14.450Z"
        }'
```
3. Setup editor
  ```
  curl --location 'https://t{{tenantID}}.{{tenantPod}}.{{zone}}.com/api/content/documentlists/entityEditors@mozu/documents' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer XXX' \
--data-raw ' {
            "name": "warranty-pricing",
            "extension": "",
            "documentTypeFQN": "entityEditor@mozu",
            "listFQN": "entityEditors@mozu",
            "publishState": "none",
            "properties": {
                "documentTypes": [],
                "documentLists": [],
                "entityLists": [
                    "warrantypricing@{{namespace}}", //TODO: update this to match the same namespace as the entity list created in step 1
                    "Default"
                ],
                "priority": 0,
                "code": "Ext.create('\''Ext.panel.Panel'\'', {\n    title: '\''Warranty Pricing Editor'\'',\n    width: 600,\n    height: 450,\n    layout: '\''anchor'\'', // Use a vertical box layout to stack components\n    renderTo: Ext.getBody(),\n    requires: ['\''Ext.data.Store'\'', '\''Ext.grid.plugin.RowEditing'\''],\n\n    // Add a plu text field as a separate item\n    items: [{\n        xtype: '\''textfield'\'',\n        fieldLabel: '\''Base PLU'\'',\n        itemId: '\''pluField'\'', // Give it a unique ID for easy reference\n        labelWidth: 50,\n        width: 200,\n        margin: '\''10 0 0 10'\''\n    }, {\n        xtype: '\''gridpanel'\'',\n        title: '\''Warranty Pricing Details'\'',\n        itemId: '\''warrantyGrid'\'', // Give the grid a unique ID\n        flex: 1, // Allow the grid to expand and fill the remaining space\n        margin: 10,\n        stateful: true, // Enable statefulness on this grid\n        stateId: '\''warranty-editor-grid'\'', // Set a new, unique ID for state management\n      \n        // Define the store for the grid\n        store: Ext.create('\''Ext.data.Store'\'', {\n            fields: ['\''plu'\'','\''fromAmount'\'', '\''toAmount'\'', '\''retailPrice'\''],\n            data: [],\n              sorters:[\n            {property: \"fromAmount\",\n            direction: \"ASC\"}\n        ],\n        }),\n        \n        // Add a stateId to each column to allow its state to be saved\n        columns: [\n            { text: '\''PLU'\'', dataIndex: '\''plu'\'', flex: 1, editor: '\''textfield'\'', stateId: '\''plu'\'' },\n            { text: '\''From Amount'\'', dataIndex: '\''fromAmount'\'', flex: 1, editor: '\''numberfield'\'', stateId: '\''fromAmount'\'' },\n            { text: '\''To Amount'\'', dataIndex: '\''toAmount'\'', flex: 1, editor: '\''numberfield'\'', stateId: '\''toAmount'\'' },\n            { text: '\''Retail Price'\'', dataIndex: '\''retailPrice'\'', flex: 1, editor: '\''numberfield'\'', stateId: '\''retailPrice'\'' }\n        ],\n\n        plugins: {\n            ptype: '\''rowediting'\'',\n            clicksToEdit: 2\n        },\n\n        dockedItems: [{\n            xtype: '\''toolbar'\'',\n            dock: '\''top'\'',\n            items: [{\n                text: '\''Add New Row'\'',\n                handler: function() {\n                    var grid = this.up('\''gridpanel'\'');\n                    var store = grid.getStore();\n                    \n                    var newRecord = Ext.create(store.model, {\n                        fromAmount: 0,\n                        toAmount: 0,\n                        retailPrice: 0\n                    });\n                    \n                    store.insert(0, newRecord); \n                    \n                    var rowEditor = grid.getPlugin('\''rowediting'\'');\n                    rowEditor.startEdit(newRecord, 0);\n                }\n            }, {\n                text: '\''Delete Row'\'',\n                handler: function() {\n                    var grid = this.up('\''gridpanel'\'');\n                    var store = grid.getStore();\n                    var selection = grid.getSelectionModel().getSelection();\n\n                    if (selection && selection.length > 0) {\n                        store.remove(selection);\n                    } else {\n                        Ext.Msg.alert('\''Select Row'\'', '\''Please select a row to delete.'\'');\n                    }\n                }\n            }]\n        }]\n    }],\n\n    // New setData function to handle the specific data format\n    setData: function (data) {\n        if (data) {\n            var pluField = this.down('\''#pluField'\'');\n            pluField.setValue(data.plu); // Populate the separate plu field\n            \n            var grid = this.down('\''#warrantyGrid'\'');\n            var store = grid.getStore();\n            if (data.prices) {\n                store.loadData(data.prices);\n            } else {\n                console.warn(\"Invalid data format. '\''prices'\'' array not found.\");\n            }\n        } else {\n            console.warn(\"No data provided to setData function.\");\n        }\n    },\n    \n    // New getData function to include the plu value\n    getData: function () {\n        var pluField = this.down('\''#pluField'\'');\n        var grid = this.down('\''#warrantyGrid'\'');\n        var store = grid.getStore();\n\n        var dataArray = [];\n        store.each(function(record) {\n            dataArray.push(record.getData());\n        });\n        \n        // Return the plu and prices array together\n        return {\n            \"plu\": pluField.getValue(),\n            \"prices\": dataArray\n        };\n    }\n});\n"
            }
        }'
```

  
5. Import lists
- Lists can either be manually created through the Editor UI or can be created in Bulk via API. 
- The `plu` is the key for Entity List lookup
```
curl --location 'https://t{{tenantId}}.{{tenantPod}}.{{zone}}.com/api/platform/entitylists/warrantypricing@{{namespace}}/entities' \
--header 'Content-Type: application/json' \
--header 'Authorization: XXXX' \
--data '{
  "plu": "20557419",
  "prices": [
    {
      "plu": "20558193",
      "fromAmount": 1,
      "toAmount": 49.99,
      "retailPrice": 29.99
    },
    {
      "plu": "20558219",
      "fromAmount": 50,
      "toAmount": 74.99,
      "retailPrice": 34.99
    },
    {
      "plu": "20558227",
      "fromAmount": 75,
      "toAmount": 99.99,
      "retailPrice": 40.99
    },
    {
      "plu": "20558243",
      "fromAmount": 100,
      "toAmount": 149.99,
      "retailPrice": 54.99
    },
    {
      "plu": "20558342",
      "fromAmount": 150,
      "toAmount": 199.99,
      "retailPrice": 64.99
    },
    {
      "plu": "20558359",
      "fromAmount": 200,
      "toAmount": 299.99,
      "retailPrice": 74.99
    },
    {
      "plu": "20558367",
      "fromAmount": 300,
      "toAmount": 399.99,
      "retailPrice": 79.99
    },
    {
      "plu": "20558375",
      "fromAmount": 400,
      "toAmount": 499.99,
      "retailPrice": 94.99
    },
    {
      "plu": "20558486",
      "fromAmount": 500,
      "toAmount": 699.99,
      "retailPrice": 129.99
    },
    {
      "plu": "20558474",
      "fromAmount": 700,
      "toAmount": 899.99,
      "retailPrice": 149.99
    },
    {
      "plu": "20558490",
      "fromAmount": 900,
      "toAmount": 999.99,
      "retailPrice": 169.99
    },
    {
      "plu": "20558508",
      "fromAmount": 1000,
      "toAmount": 1999.99,
      "retailPrice": 199.99
    },
    {
      "plu": "20558524",
      "fromAmount": 2000,
      "toAmount": 2999.99,
      "retailPrice": 249.99
    },
    {
      "plu": "20558532",
      "fromAmount": 3000,
      "toAmount": 4999.99,
      "retailPrice": 349.99
    },
    {
      "plu": "20558540",
      "fromAmount": 5000,
      "toAmount": 9999.99,
      "retailPrice": 439.99
    },
    {
      "plu": "20558557",
      "fromAmount": 10000,
      "toAmount": 29999.99,
      "retailPrice": 1399.99
    },
    {
      "plu": "20558565",
      "fromAmount": 30000,
      "toAmount": 49999.99,
      "retailPrice": 2499.99
    }
  ]
}
'
```

```
