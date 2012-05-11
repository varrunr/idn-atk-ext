/* 
 *
 * Authors: Varrun Ramani <varrunr@gmail.com>
 * 			Rohit Mathew <rohitjmathew@gmail.com>
 *			Mengli Yuan <ymenglifall@gmail.com>
 *
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
	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}
	
function getranking(reqUrl){
	
	/**
	 * Sends request to the Alexa API to fetch the ranking of the url
	 */
	
	var req;
	req=new XMLHttpRequest();
	req.open(	"GET",
				"http://data.alexa.com/data?"+"cli=10&"+"url="+reqUrl,
				false);
	req.send(null);
	
	var ranking=req.responseXML.getElementsByTagName('POPULARITY');
	if(ranking[0] == undefined){ 
		return -1;
	}
	var websiteranking=ranking[0].getAttribute("TEXT");
	
	if(websiteranking){
		return websiteranking;
	}
	else{
		return -1;
	}
}

function createConfusableMatrix(){
	
	/**
	 * Loads the list of confusable unicode
	 * characters into the memory.
	 * Source: http://unicode.org/reports/tr36/confusables.txt
	 */
	
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
							['ɩ','l','1'],
							['ł' , 'ɫ'],
							['g','ɡ'],
							['v','ѵ','ν'],
							['b', 'ƅ'],
							['m','rn'],
							['p','ρ','р'],
							['r','г'],
							['n','ո'],
							['h','հ'],
							['u','ս'],
							['f','ք'],
							['y','ყ'],
							['-','‐','‒']									
				   		];
	return ConfusableMatrix;
}

function findConfusable( confusion , susp){

	/**
	 * Find and return the the list of of confusable
	 * characters for a given suspicious character
	 */
	 
	for (i=0; i<confusion.length;i++){
		for (j=0; j<confusion[i].length;j++){
			if (confusion[i][j] == susp){
				return i;
			}				
		}
	}
	return -1;
}

function copypath(path){
	/* Creating a copy of an array */
	var newpath = new Array();
	var k = 0;
	for(k = 0; k < path.length ; k++) 
	{
		newpath.push(path[k]);
	}
	return newpath;
}

function arr2str(path){
	/* Convert array to string */
	var i;
	var str = '';
	for(i = 0; i < path.length; i++)
	{
		str += path[i];
	}
	return str;
}

function str2arr(path){
	/* Convert string to array */
	var arr = new Array();
	for(var i = 0; i < path.length; i++)
	{
		arr[i] = path[i];
	}
	return arr;
}

function permute(confusion , domain , path , index , listOfUrls)
{	
	/* 
	 * Permutes the given domain by substitutinga visually
	 * ambiguous characters by their list of confusables
	 */
	 
	if (index >= domain.length)
	{
		/* Base case */
		listOfUrls.push( arr2str(path) );
		return;
	}	
	else
	{
		susp = domain[index];
		var row = -1;
		/* Return list of confusables */
		row = findConfusable(confusion , susp);
		
		if(row == -1)
		{
			/* If character is not a confusable */
			var newpath = path;
			newpath.push(susp);
			permute( confusion, domain, newpath, 
					 index + 1, listOfUrls);
		}
		else
		{
			/* If character is confusable */
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

function checkURL(URL,tld)
{
	var url = str2arr(URL);
	
	
	confusion = createConfusableMatrix();
	
	var path = new Array();
	var spoofedUrls = new Array();
	
	/* Permute url and store in spoofedUrls */
	permute(confusion, url,  path , 0 , spoofedUrls);
	console.log("Number of permutations: " + spoofedUrls.length);
	
	
	var rankings = new Array();
	var idnattacks = new Array();
	var  i = 0;
	
	for(i = 0;i<spoofedUrls.length;i++){
		/* Convert Unicode to Punycode to send request */
		var pUrl = toASCII( spoofedUrls[i]+ '.' + tld);
		/* Get Rank */
		var rank = getranking(pUrl);
		if(rank != -1)
		{
			/* If website exists */
			idnattacks.push(pUrl);
			rankings.push(rank);
			console.log(' Unicode:'+ spoofedUrls[i] + '.' + tld + 
						' Punycode:' + toASCII(pUrl) + 
						' Rank:' + rank);
		}
	}

	// TODO: Send message to UI to display
	
	if(idnattacks.length > 0){
	console.log('This url can be confused with ' + idnattacks.length + ' other URLS. Blocking Access');
	}
	return idnattacks.length;
	
}

function isSpoofed(uniUrl,tld){
	if(checkURL(uniUrl,tld)){
		return true;
	}
	return false;
};


function checkForSpoofedUrl2(requestUrl)
{
	
	if(requestUrl.length >= 9)
	{
		/* Check if the url is a chrome internal call */
		if(requestUrl.substr(0,9) == 'chrome://'){
			return false;
		}
	}
	
	/* Obtain only the domain name from url */
	var lnk = document.createElement('a');
	lnk.href = requestUrl;
	var domain = (lnk.host.match(/([^.]+)\.\w{2,3}(?:\.\w{2})?$/) || [])[0];
	if(domain == undefined){
		return false;
	}
	
	/* Check if the url is an international domain
	 * i.e if it is in Punycode
	 */
	var prefix = 'na';
	if(domain.length >= 4){
		prefix = domain.substring(0,4);
		if(prefix != 'xn--'){
			return false;
		}
	}
	console.log(domain + ' is an international domain');
	
	/* Split domain into the server and top level domain
	 * This is so that the tld need not be permuted
	 */
	 
	var tld = domain.split('.', 2)[1];
	var dName = domain.split('.',2)[0];
	if( tld.length < 3){
		return false;
	}
	
	/* Convert the punycoded URL to Unicode */
	var uniUrl = toUnicode(dName);
	
	/* If the URL is spoofed prevent access */
	if(isSpoofed(uniUrl, tld)){
		return true;
	}
	else{
		return false;
	}
};

/* Listen for web requests */
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
  return {cancel: checkForSpoofedUrl2(details.url)}; 
  },
  {urls: ["http://*/*"]},
  ["blocking"]);
  
