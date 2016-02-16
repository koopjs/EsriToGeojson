# GeoJSON
*Converts Esri JSON and CSV to GeoJSON format*

Example: Convert Esri JSON to GeoJSON
```javascript
const GeoJSON = require('geojson')

const options = [{
        name: 'NAME',
        type: 'esriFieldTypeSmallInteger',
        alias: 'NAME',
        domain: {
            type: 'codedValue',
            name: 'NAME',
            codedValues: [
                {
                    name: 'Name0',
                    code: 0
                },
                {
                    name: 'Name1',
                    code: 1
                }
            ]
        }
    }]
    const esriJSON = {
        features: [{
            attributes: {
                NAME: 0
            }
        }, {
            attributes: {
                NAME: 1
            }
        }]
    }

const geojson = GeoJSON.fromEsri(esriJSON, options)

console.log(geojson)
```