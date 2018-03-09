const tagRegExp = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;
const attrRegExp = /([\w_-]+)(?:=(?:'([^']*?)'|"([^"]*?)"))?/g;
const commentRegExp = /<!--(?:[^-]|-[^-])*-->/g;
const syntax = /\{\{\s*([^\}]+)\s*\}\}\}?/g;

/* helper functions to be used inside the generated code */

/** @function safeAccess
 * safely access the given property in the object obj.
 *
 * @param obj (Object) - the object to read the property from
 * @param attrs (String) - the name of the property to access (allows for object paths via ., e.g. "myprop.firstValue")
 * @param escape (Boolean) - if the value should be HTML escaped to prevent XSS attacks and such
 * @return any
 */
const safeAccess = 'function safeAccess(e,t,r){if(!t)return e;if("."===t[0])return e[t];var l=t.split(" ");for(t=l[0].split(".");t.length>0&&void 0!==(e=e[t.shift()]););return"string"==typeof e&&!0===r?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;").replace(/>/g,"&gt;"):"function"==typeof e?e.apply(null,l.slice(1)):"number"==typeof e?e:e||""}'/*`function safeAccess(obj, attrs, escape) {
	if (!attrs) return obj;
	if (attrs[0] === '.') {
		return obj[attrs];
	}
	var parts = attrs.split(' ');
	attrs = parts[0].split('.');
	while (attrs.length > 0 && typeof (obj = obj[attrs.shift()]) !== 'undefined');
	if (typeof obj === 'string' && escape === true) {
		return obj.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/>/g, '&gt;');
	} else if (typeof obj === 'function') {
		return obj.apply(null, parts.slice(1));
	} else {
		return typeof obj === 'number' ? obj : (obj || '');
	}
}`*/;

/** @function toArray
 * turn property value of an object into an array
 *
 * @param data (Object) - the object to read the property value from
 * @param value (String) - the property whose value should be read from the object
 * @return Array
 */
const toArray = 'function toArray(t,e){var o=safeAccess(t,e);if(o){var r=Object.getPrototypeOf([]);return Object.getPrototypeOf(o)===r||Object.getPrototypeOf(Object.getPrototypeOf(o))===r?o:"function"==typeof o?o():[o]}return[]}'/*`function toArray(data, value) {
	var dataValue = safeAccess(data, value);
	if (dataValue) {
		var arrayPrototype = Object.getPrototypeOf([]);
		if (Object.getPrototypeOf(dataValue) === arrayPrototype || Object.getPrototypeOf(Object.getPrototypeOf(dataValue)) === arrayPrototype) {
			return dataValue;
		} else if (typeof dataValue === 'function') {
			return dataValue();
		} else return [dataValue];
	} else {
		return [];
	}
}`*/;

/** @function spread
 * turns an array of arrays into an array of all containing elements (reduces the array depth by 1)
 *
 * @param array (Array) - the array to spread the values along
 * @return Array - a new array containing all the values of the sub elements
 */
const spread = 'function spread(t){var e=[];return t.forEach(function(t){e=e.concat(t)}),e}'/*`function spread(array) {
	var result = [];
	array.forEach(function(entry) {
		result = result.concat(entry);
	});
	return result;
}`*/;

/** @function merge
 * merges any number of objects into the target object
 * @param target (Object) - the object the other object should be merged into
 * @param obj1 (Object) - the first object to be merged into the target object
 * @param objn (Object) - all nth object to be merged into the target object
 * @return Object - the target object
 */
const merge = 'function merge(t){return[].slice.call(arguments,1).forEach(function(e){for(var r in e)t[r]=e[r]}),t}'/*`function merge(target) {
	[].slice.call(arguments, 1).forEach(function (arg) {
		for (var all in arg) {
			target[all] = arg[all];
		}
	});

	return target;
}`*/;

/* this is the base structure of the template */
const baseCode = 'module.exports = (function(){ {{helperFunctions}};return{render:function(data){return [].concat({{render}}\'\').join("")}}}());'/*`function() {
	{{helperFunctions}}

	return {
		render: function(data) {
			return [].concat({{render}}'').join('')
		}
	};
}());`*/;


/** takes an HTML string containing mustache code and turns it into executable JS code that generates a vdom */
module.exports = function parse(data) {
	let resultObject = {
		helperFunctions: [safeAccess],
		render: ''
	};
	let usesMerge = false, usesRenderStyle = false, usesSpread = false;
	let match, lastIndex = 0, level = 0, tagStack = [];

	// return the correct data level for multi-level mustache blocks
	function getData() {
		return `data${level === 0 ? '' : '$' + level}`;
	}

	// text is the only place where mustache code can be found
	function handleText(text, isAttr) {
		let match, result = '', lastIndex = 0;
		let cat = isAttr ? ' + ' : ', ';
		if (!text.match(syntax)) {
			return result += "'" + text.substr(lastIndex).replace(/\n/g, '').replace(/'/g, '\\\'') + "'" + cat;
		}
		// locate mustache syntax within the text
		while (match = syntax.exec(text)) {
			if (match.index < lastIndex) continue;
			let frag = text.substring(lastIndex, match.index).replace(/^\s+/g, '');
			if (frag.length > 0) {
				result += "'" + frag.replace(/\n/g, '').replace(/'/g, '\\\'') + "'" + cat;
			}
			lastIndex = match.index + match[0].length;
			let key = match[1];
			// of "{{#test}}" value will be "test"
			let value = key.substr(1);
			if (key[0] === '#') {
				// handle block start
				result += `(spread(toArray(${getData()}, '${value}').map(function (e, i, a) {
						var data$${level + 1} = merge({}, data${0 >= level ? '' : '$' + level}, {'.': e, '.index': i, '.length': a.length}, e);
						return [].concat(`;
				level += 1;
				usesMerge = true;
				usesSpread = true;
			} else if (key[0] === '/') {
				// handle block end
				result += '\'\'); })).join(""))' + cat;
				level -= 1;
				if (level < 0) {
					throw new Error('Unexpected end of block: ' + key.substr(1));
				}
			} else if (key[0] === '^') {
				// handle inverted block start
				result += `((safeAccess(${getData()}, '${value}') && (typeof safeAccess(${getData()}, '${value}') === 'boolean' || safeAccess(${getData()}, '${value}').length > 0)) ? [] : spread([1].map(function() { var data$${level + 1} = merge({}, data${0 >= level ? '' : '$' + level}); return [].concat(`;
				usesMerge = true;
				usesSpread = true;
				level += 1;
			} else if (key[0] === '>') {
				// handle partial end
				result += `require('./${value.trim()}.js').render(${getData()})${cat}`;
			} else if (key[0] !== '{' && key[0] !== '!') {
				// handle non-escaping prints "{{{myvar}}}"
				value = key;
				result += `''+safeAccess(${getData()}, '${value}', true)${cat}`
			} else if (key[0] !== '!') {
				// regular prints "{{myvar}}"
				result += `''+safeAccess(${getData()}, '${value}')${cat}`;
			} // ignore comments
		}
		if (text.substr(lastIndex).length > 0) {
			result += "'" + text.substr(lastIndex).replace(/\n/g, '').replace(/'/g, '\\\'') + "'" + cat;
		}
		return result;
	}

	// generate attribute objects for vdom creation
	function makeAttributes(attrs) {
		let attributes = '{';
		let attr;

		while ((attr = attrRegExp.exec(attrs))) {
			if (attributes !== '{') attributes += ', ';
			attributes += '"' + attr[1].toLowerCase() + '": ' + handleText(attr[2] || attr[3] || '', true).replace(/\s*[,+]\s*$/g, '');
		}
		return attributes + '}';
	}

	resultObject.render = handleText(data, true);
	if (level > 0) {
		throw new Error('Unexpected end of block');
	}

	// add helper functions that were used by the code
	if (usesMerge) {
		resultObject.helperFunctions.push(merge);
		resultObject.helperFunctions.push(toArray);
	}
	if (usesSpread) {
		resultObject.helperFunctions.push(spread);
	}
	resultObject.helperFunctions = resultObject.helperFunctions.join(';');

	// fill in place-holders in base code and return the result
	return baseCode.replace(/\{\{([^\}]+)\}\}/g, (g, m) => resultObject[m]);
};
