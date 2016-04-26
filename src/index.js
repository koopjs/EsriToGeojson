'use strict'

const arcgisToGeoJSON = require('arcgis-to-geojson-utils').arcgisToGeoJSON
const _ = require('lodash')
const toGeoJSON = {}


/**
 * Converts csv to geojson
 *
 * @param {array} csv - csv file parsed using https://www.npmjs.com/package/csv
 * @returns {object} geojson - geojson object
 * */

toGeoJSON.fromCSV = (csv) => {
    const geojson = { type: 'FeatureCollection' }
    const headers = csvHeaders(csv.shift())

    geojson.features = _.map(csv, (feat, key) => {
        const feature = { type: 'Feature', id: key }
        feature.properties = constructProps(headers, feat)
        feature.properties.OBJECTID = key
        feature.geometry = convertCSVGeom(headers, feat)
        return feature
    })

    return geojson ? geojson : null
}

/**
 * Parse array of headers and sanitize them
 *
 * @param {array} inFields - array of headers
 * @returns {array} headers - array of sanitized headers
 */

function csvHeaders(inFields) {
    const headers = []
     _.each(inFields, (field) => {
        headers.push(convertFieldName(field))
    })
    return headers
}

/**
 * Convert CSV geom to geojson
 *
 * @param {array} headers - array of headers
 * @param {array} feature - individual feature
 * @returns {object} geometry - geometry object
 */

function convertCSVGeom(headers, feature) {
    const geometry = {type: 'Point', coordinates: []}
    _.each(headers, (header, key) => {
        if (['lat', 'latitude', 'latitude_deg', 'y'].indexOf(header.trim().toLowerCase()) > -1) {
            geometry.coordinates.unshift(parseFloat(feature[key]))
        } else if (['lon', 'longitude', 'longitude_deg', 'x'].indexOf(header.trim().toLowerCase()) > -1) {
            geometry.coordinates.unshift(parseFloat(feature[key]))
        }
    })
    return geometry
}

/**
 * Covert fields into properties object
 * @param {array} headers - array of headers
 * @param {array} feature - individual feature
 * @returns {object} properties - property object
 */

function constructProps(headers, feature) {
    const properties = {}
    _.each(headers, (header, key) => {
        properties[header] = (!isNaN(feature[key])) ? parseFloat(feature[key]) : feature[key]
    })
    return properties
}


/**
 * Converts esri json to GeoJSON
 *
 * @param {object} esriJSON - The entire esri json response
 * @param {object} options - The fields object returned in esri json
 * @returns {object} geojson - geojson object
 *
 * */

toGeoJSON.fromEsri = (esriJSON, options) => {

    if (!options) options = {}
    if (!options.fields) options.fields = esriJSON.fields

    let geojson = { type: 'FeatureCollection' }
    const fields = convertFields(options.fields)

    geojson.features = _.map(esriJSON.features, (feature) => {
        return transformFeature(feature, fields)
    })

    return geojson ? geojson : null
}


/**
 * Converts a set of fields to have names that work well in JS
 *
 * @params {object} inFields - the original fields object from the esri json
 * @returns {object} fields - converted fields
 * @private
 * */

function convertFields(infields) {
    const fields = {}

    _.each(infields, (field) => {
        field.outName = convertFieldName(field.name)
        fields[field.name] = field
    })
    return fields
}


/**
 * Converts a single field name to a legal javascript object key
 *
 * @params {string} name - the original field name
 * @returns {string} outName - a cleansed field name
 * @private
 * */

function convertFieldName(name) {
    const regex = new RegExp(/\.|\(|\)/g)
    const spaceRegex = new RegExp(/\s/g)
    return name.replace(regex, '').replace(spaceRegex, '_')
}


/**
 * Converts a single feature from esri json to geojson
 *
 * @param {object} feature - a single esri feature
 * @param {object} fields - the fields object from the service
 * @returns {object} feature - a geojson feature
 * @private
 * */

function transformFeature(feature, fields) {
    const attributes = {}

    // first transform each of the features to the converted field name and transformed value
    if (feature.attributes && Object.keys(feature.attributes)) {
        _.each(Object.keys(feature.attributes), (name) => {
            let attr = {}
            attr[name] = feature.attributes[name]
            try {
                attributes[fields[name].outName] = convertAttribute(attr, fields[name])
            } catch (e) {
                console.error('Field was missing from attribute')
            }
        })
    }

    return {
        type: 'Feature',
        properties: attributes,
        geometry: parseGeometry(feature.geometry)
    }
}

/**
 * Decodes an attributes CVD and standardizes any date fields
 *
 * @params {object} attribute - a single esri feature attribute
 * @params {object} field - the field metadata describing that attribute
 * @returns {object} outAttribute - the converted attribute
 * @private
 * */

function convertAttribute(attribute, field) {
    const inValue = attribute[field.name]
    let value

    if (inValue === null) return inValue

    if (field.domain && field.domain.type === 'codedValue') {
        value = cvd(inValue, field)
    } else if (field.type === 'esriFieldTypeDate') {
        try {
            value = new Date(inValue).toISOString()
        } catch (e) {
            value = inValue
        }
    } else {
        value = inValue
    }
    return value
}

/**
 * Looks up a value from a coded domain
 *
 * @params {integer} value - The original field value
 * @params {object} field - metadata describing the attribute field
 * @returns {string/integerfloat} - The decoded field value
 * */

function cvd(value, field) {
    const domain = _.find(field.domain.codedValues, d => {
        return value === d.code
    })
    return domain ? domain.name : value
}

/**
 * Convert an esri geometry to a geojson geometry
 *
 * @param {object} geometry - an esri geometry object
 * @return {object} geojson geometry
 * @private
 * */

function parseGeometry(geometry) {
    try {
        const parsed = geometry ? arcgisToGeoJSON(geometry) : null
        if (parsed && parsed.type && parsed.coordinates) return parsed
        else {
            return null
        }

        return parsed
    } catch (e) {
        console.error(e)
        return null
    }
}


module.exports = toGeoJSON
