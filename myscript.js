/* 
 * Puncode conversion code written by @mathias
 * http://mths.be/punycode
 *
 */
	
	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexPunycode = /^xn--/,

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process.',
		'ucs2decode': 'UCS-2(decode): illegal sequence',
		'ucs2encode': 'UCS-2(encode): illegal value',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,
	key;

	function error(type) {
		throw RangeError(errors[type]);
	}

	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	function mapDomain(string, fn) {
		var glue = '.';
		return map(string.split(glue), fn).join(glue);
	}

	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if ((value & 0xF800) == 0xD800) {
				extra = string.charCodeAt(counter++);
				if ((value & 0xFC00) != 0xD800 || (extra & 0xFC00) != 0xDC00) {
					error('ucs2decode');
				}
				value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
			}
			output.push(value);
		}
		return output;
	}

	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if ((value & 0xF800) == 0xD800) {
				error('ucs2encode');
			}
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	function basicToDigit(codePoint) {
		return codePoint - 48 < 10
			? codePoint - 22
			: codePoint - 65 < 26
				? codePoint - 65
				: codePoint - 97 < 26
					? codePoint - 97
					: base;
	}

	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}


	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	function encodeBasic(codePoint, flag) {
		codePoint -= (codePoint - 97 < 26) << 5;
		return codePoint + (!flag && codePoint - 65 < 26) << 5;
	}

	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    length,
		    /** Cached calculation results */
		    baseMinusT;

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}
			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}
			n += floor(i / out);
			i %= out;
			
			output.splice(i++, 0, n);

		}
		return ucs2encode(output);
	}

	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 */

	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}


function createConfusableMatrix()
{	
	var ConfusableMatrix = new Array();
	
	ConfusableMatrix = [
							['ə' , 'ә'],
							['а' , 'a'],
							['o' , 'ο' , 'о'],
							['s' , 'ѕ'],
							['x' , 'х'],
							['æ' , 'ӕ'],
							['i' , 'і'],
							['j' , 'ј'],
							['p' , 'р'],
							['c' , 'с'],
							['y' , 'у'],
							['a' , 'ɑ'],
							['ı' , 'ɩ'],
							['ł' , 'ɫ'],
							['l' , '1'],
							['g','ɡ'],
							['v','ѵ','ν'],
							['b', 'ƅ']						
				   		];

	return ConfusableMatrix;
}

function findConfusable( confusion , susp)
{
	for (i=0; i<confusion.length;i++){
		for (j=0; j<confusion[i].length;j++){
			if (confusion[i][j] == susp){
				return i;
			}				
		}
	}
	return -1;
}

function copypath(path)
{
	var newpath = new Array();
	var k = 0;
	for(k = 0; k < path.length ; k++) 
	{
		newpath.push(path[k]);
	}
	return newpath;
}

function arr2str(path)
{
	var i;
	var str = '';
	for(i = 0; i < path.length; i++)
	{
		str += path[i];
	}
	return str;
}


function permute(confusion , domain , path , index , listOfUrls)
{	
	if (index >= domain.length)
	{
		listOfUrls.push( arr2str(path) );
		return;
	}	
	else
	{
		susp = domain[index];
		var row = -1;
		row = findConfusable(confusion , susp);
		
		if(row == -1)
		{
			var newpath = path;
			newpath.push(susp);
			permute( confusion, domain, newpath, 
					 index + 1, listOfUrls);
		}
		else
		{
			var j = 0;
			for(j = 0; j < confusion[row].length ; j++)
			{
				var newpath = copypath(path);
				newpath.push(confusion[row][j]);
				permute(confusion , domain , newpath , 
						index + 1,listOfUrls);
			}
		}
	}	
}

function str2arr(path)
{
	var arr = new Array();
	for(var i = 0; i < path.length; i++)
	{
		arr[i] = path[i];
	}
	return arr;
}

function checkURL(URL)
{
	var url = str2arr(URL);
	
	confusion = createConfusableMatrix();
	
	var path = new Array();
	var spoofedUrls = new Array();
	
	permute(confusion, url,  path , 0 , spoofedUrls);
	console.log(spoofedUrls.length);		
	
}

function isSpoofed(uniUrl){
	checkURL(uniUrl);
	return true;
};

function checkForSpoofedUrl(tabId, changeInfo, tab)
{
	// Get url from tab
	if(tab.url.length >= 9)
	{
		if(tab.url.substr(0,9) == 'chrome://'){
			return;
		}
	}
	
	var lnk = document.createElement('a');
	lnk.href = tab.url;
	var domain = (lnk.host.match(/([^.]+)\.\w{2,3}(?:\.\w{2})?$/) || [])[0];
	if(domain == undefined){
		return;
	}
	
	var prefix = 'na';
	if(domain.length >= 4){
		prefix = domain.substring(0,4);
		if(prefix != 'xn--'){
			return;
		}
	}
	var uniUrl = '';
	var uniUrl = toUnicode(domain);
	isSpoofed(uniUrl);
	
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForSpoofedUrl);
