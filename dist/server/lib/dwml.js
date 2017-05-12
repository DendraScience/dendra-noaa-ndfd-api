'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Digital Weather Markup Language (DWML) document parser classes.
 * Based on https://graphical.weather.gov/xml/mdl/XML/Design/MDL_XML_Design.pdf
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module lib/dwml
 */

const moment = require('moment');

/*
  Why oh why are the node type constants not exposed? Adding these to our faux Node interface.

  SEE: https://github.com/jindw/xmldom/pull/151
 */
const Node = {
  ELEMENT_NODE: 1
  // NOTE: Not used
  // ATTRIBUTE_NODE: 2,
  // TEXT_NODE: 3,
  // CDATA_SECTION_NODE: 4,
  // ENTITY_REFERENCE_NODE: 5,
  // ENTITY_NODE: 6,
  // PROCESSING_INSTRUCTION_NODE: 7,
  // COMMENT_NODE: 8,
  // DOCUMENT_NODE: 9,
  // DOCUMENT_TYPE_NODE: 10,
  // DOCUMENT_FRAGMENT_NODE: 11,
  // NOTATION_NODE: 12
};

class DWMLLocation {
  constructor(dwmlDoc, locationEl) {
    this.element = locationEl;
  }

  get locationKey() {
    if (this._locationKey) return this._locationKey;

    const els = this.element.getElementsByTagName('location-key');
    return this._locationKey = els.length > 0 ? els[0].firstChild.nodeValue : null;
  }

  get point() {
    if (this._point) return this._point;

    const point = {};
    const pointEls = this.element.getElementsByTagName('point');

    if (pointEls.length > 0) {
      const pointEl = pointEls[0];
      point.latitude = parseFloat(pointEl.getAttribute('latitude'));
      point.longitude = parseFloat(pointEl.getAttribute('longitude'));
    }

    return this._point = point;
  }

  toJSON() {
    const obj = {
      location_key: this.locationKey,
      point: this.point
    };

    return obj;
  }
}

class DWMLTimeLayout {
  constructor(dwmlDoc, timeLayoutEl) {
    this.element = timeLayoutEl;
  }

  get layoutKey() {
    if (this._layoutKey) return this._layoutKey;

    const els = this.element.getElementsByTagName('layout-key');
    return this._layoutKey = els.length > 0 ? els[0].firstChild.nodeValue : null;
  }

  get parsedKey() {
    const key = this.layoutKey;
    const parsed = {};

    if (key) {
      const parts = key.split('-');
      parsed.period = parts[1];
      parsed.times = parts[2];
      parsed.seq = parseInt(parts[3]);
    }

    return parsed;
  }

  get timeCoordinate() {
    return this.element.getAttribute('time-coordinate');
  }

  get validTimes() {
    return this._validTimes ? this._validTimes : this._validTimes = Array.from(this.validTimeGen());
  }

  *validTimeGen() {
    const startEls = this.element.getElementsByTagName('start-valid-time');
    const endEls = this.element.getElementsByTagName('end-valid-time');

    for (let i = 0; i < startEls.length; i++) {
      const startEl = startEls[i];
      const startString = startEl.firstChild.nodeValue;
      const startMoment = moment.parseZone(startString);

      const obj = {
        start: {
          date: startMoment.toDate(),
          offset: startMoment.utcOffset() * 60,
          string: startString
        }
      };

      const periodName = startEl.getAttribute('period-name');
      if (typeof periodName === 'string') obj.start.period_name = periodName;

      if (endEls[i]) {
        const endEl = endEls[i];
        const endString = endEl.firstChild.nodeValue;
        const endMoment = moment.parseZone(endString);
        obj.end = {
          date: endMoment.toDate(),
          offset: endMoment.utcOffset() * 60,
          string: endString
        };
      }

      yield obj;
    }
  }

  toJSON() {
    const obj = {
      layout_key: this.layoutKey,
      parsed_key: this.parsedKey,
      time_coordinate: this.timeCoordinate
    };

    return obj;
  }
}

class DWMLParameter {
  constructor(dwmlDoc, parametersEl, parameterEl) {
    this.element = parameterEl;

    const locationKey = this.locationKey = parametersEl.getAttribute('applicable-location');
    if (locationKey) this.location = dwmlDoc.locations[locationKey];

    const layoutKey = this.timeLayoutKey = parameterEl.getAttribute('time-layout');
    if (layoutKey) this.timeLayout = dwmlDoc.timeLayouts[layoutKey];
  }

  get elementName() {
    return this.element.nodeName;
  }

  get keyPath() {
    if (this._keyPath) return this._keyPath;

    const p = [];

    let k;
    if (k = this.elementName) p.push(k);
    if (k = this.type) p.push(k);
    if (k = this.timeLayout) {
      const pk = k.parsedKey;
      if (pk.period) p.push(pk.period);
      if (pk.times) p.push(pk.times);
    }

    return this._keyPath = `/${p.join('/')}`;
  }

  get name() {
    if (this._name) return this._name;

    const els = this.element.getElementsByTagName('name');
    return this._name = els.length > 0 ? els[0].firstChild.nodeValue : null;
  }

  get type() {
    return this.element.getAttribute('type');
  }

  toJSON() {
    const obj = {
      element_name: this.elementName,
      key_path: this.keyPath,
      name: this.name,
      type: this.type
    };
    if (this.location) obj.location = this.location.toJSON();
    if (this.timeLayout) obj.time_layout = this.timeLayout.toJSON();

    return obj;
  }
}

class DWMLConditionsIconsParameter extends DWMLParameter {
  get iconLinks() {
    return Array.from(this.iconLinkGen());
  }

  *iconLinkGen() {
    const iconLinkEls = this.element.getElementsByTagName('icon-link');

    for (let i = 0; i < iconLinkEls.length; i++) {
      // TODO: Check for xsi:nil="true"?
      const nd = iconLinkEls[i].firstChild;
      yield nd ? nd.nodeValue : null;
    }
  }

  get series() {
    return Array.from(this.seriesGen());
  }

  *seriesGen() {
    if (!this.timeLayout) return;

    const validTimes = this.timeLayout.validTimes;
    let i = 0;

    for (const iconLink of this.iconLinkGen()) {
      const validTime = validTimes[i++];

      if (validTime) {
        yield {
          time: validTime,
          data: {
            url: iconLink
          }
        };
      }
    }
  }

  toJSON() {
    const obj = super.toJSON();
    obj.series = this.series;

    return obj;
  }
}

class DWMLUnitsParameter extends DWMLParameter {
  get units() {
    return this.element.getAttribute('units');
  }

  get values() {
    return Array.from(this.valueGen());
  }

  *valueGen() {
    const valueEls = this.element.getElementsByTagName('value');

    for (let i = 0; i < valueEls.length; i++) {
      // TODO: Check for xsi:nil="true"?
      const nd = valueEls[i].firstChild;
      yield nd ? parseFloat(nd.nodeValue) : null;
    }
  }

  get series() {
    return Array.from(this.seriesGen());
  }

  *seriesGen() {
    if (!this.timeLayout) return;

    const validTimes = this.timeLayout.validTimes;
    let i = 0;

    for (const value of this.valueGen()) {
      const validTime = validTimes[i++];

      if (validTime) {
        yield {
          time: validTime,
          value: value
        };
      }
    }
  }

  toJSON() {
    const obj = super.toJSON();
    obj.units = this.units;
    obj.series = this.series;

    return obj;
  }
}

const WEATHER_CONDITIONS_VALUE_ATTRIBUTES = {
  'coverage': 'coverage',
  'intensity': 'intensity',
  'additive': 'additive',
  'weather-type': 'weather_type',
  'qualifier': 'qualifier'
};

class DWMLWeatherParameter extends DWMLParameter {
  get weatherConditions() {
    return Array.from(this.weatherConditionsGen());
  }

  *weatherConditionsGen() {
    const attrNames = Object.keys(WEATHER_CONDITIONS_VALUE_ATTRIBUTES);
    const weatherConditionsEls = this.element.getElementsByTagName('weather-conditions');

    for (let i = 0; i < weatherConditionsEls.length; i++) {
      const weatherConditionsEl = weatherConditionsEls[i];
      const summary = weatherConditionsEl.getAttribute('weather-summary');
      const valueEls = weatherConditionsEl.getElementsByTagName('value');
      const values = [];

      for (let j = 0; j < valueEls.length; j++) {
        const valueEl = valueEls[j];
        const value = {};

        // Map attribute names to field names
        attrNames.forEach(attrName => {
          const attrVal = valueEl.getAttribute(attrName);
          if (attrVal) value[WEATHER_CONDITIONS_VALUE_ATTRIBUTES[attrName]] = attrVal;
        });

        values.push(value);
      }

      const obj = {};
      if (typeof summary === 'string') obj.summary = summary;
      if (values.length > 0) obj.values = values;

      yield obj;
    }
  }

  get series() {
    return Array.from(this.seriesGen());
  }

  *seriesGen() {
    if (!this.timeLayout) return;

    const validTimes = this.timeLayout.validTimes;
    let i = 0;

    for (const weatherConditions of this.weatherConditionsGen()) {
      const validTime = validTimes[i++];

      if (validTime) {
        yield {
          time: validTime,
          data: weatherConditions
        };
      }
    }
  }

  toJSON() {
    const obj = super.toJSON();
    obj.series = this.series;

    return obj;
  }
}

const ELEMENT_NAME_TO_PARAMETER_CLASS = {
  'cloud-amount': DWMLUnitsParameter,
  'conditions-icon': DWMLConditionsIconsParameter,
  'conditions-icons': DWMLConditionsIconsParameter,
  'precipitation': DWMLUnitsParameter,
  'probability-of-precipitation': DWMLUnitsParameter,
  'temperature': DWMLUnitsParameter,
  'weather': DWMLWeatherParameter
};

class DWMLDocument {
  constructor(xmlDoc) {
    const dataEls = xmlDoc.getElementsByTagName('data');

    if (dataEls.length === 0) throw new Error('Missing data element');

    this.dataElement = dataEls[0];
    this.xmlDocument = xmlDoc;
  }

  get locations() {
    return this._locations ? this._locations : this._locations = Array.from(this.locationGen()).reduce((obj, cur) => {
      obj[cur.locationKey] = cur;
      return obj;
    }, {});
  }

  *locationGen() {
    const locationEls = this.dataElement.getElementsByTagName('location');

    for (let i = 0; i < locationEls.length; i++) {
      yield new DWMLLocation(this, locationEls[i]);
    }
  }

  get parameters() {
    return this._parameters ? this._parameters : this._parameters = Array.from(this.parameterGen());
  }

  *parameterGen() {
    const parametersEls = this.dataElement.getElementsByTagName('parameters');

    for (let i = 0; i < parametersEls.length; i++) {
      const parametersEl = parametersEls[i];
      const nds = parametersEl.childNodes;

      for (let j = 0; j < nds.length; j++) {
        const nd = nds[j];

        if (nd.nodeType === Node.ELEMENT_NODE) {
          const Klass = ELEMENT_NAME_TO_PARAMETER_CLASS[nd.nodeName];
          if (Klass) yield new Klass(this, parametersEl, nd);
        }
      }
    }
  }

  get timeLayouts() {
    return this._timeLayouts ? this._timeLayouts : this._timeLayouts = Array.from(this.timeLayoutGen()).reduce((obj, cur) => {
      obj[cur.layoutKey] = cur;
      return obj;
    }, {});
  }

  *timeLayoutGen() {
    const timeLayoutEls = this.dataElement.getElementsByTagName('time-layout');

    for (let i = 0; i < timeLayoutEls.length; i++) {
      yield new DWMLTimeLayout(this, timeLayoutEls[i]);
    }
  }
}

exports.DWMLConditionsIconsParameter = DWMLConditionsIconsParameter;
exports.DWMLDocument = DWMLDocument;
exports.DWMLLocation = DWMLLocation;
exports.DWMLParameter = DWMLParameter;
exports.DWMLTimeLayout = DWMLTimeLayout;
exports.DWMLUnitsParameter = DWMLUnitsParameter;
exports.DWMLWeatherParameter = DWMLWeatherParameter;