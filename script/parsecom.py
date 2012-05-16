# coding: utf-8
import codecs
import urllib
import urllib2
import xml.etree.ElementTree as ET

def create_confusables():
	""" Create matrix as raw unicode """
	ConfusableMatrix = [
							#['ə' , 'ә'],
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
							['l','ɩ','1'],
							['ł' , 'ɫ'],
							['g','ɡ'],
							['v','ѵ','ν'],
							['b', 'ƅ'],
							#['m','rn'],
							['p','ρ','р'],
							['r','г'],
							['n','ո'],
							['h','հ'],
							['u','ս'],
							['f','ք'],
							['y','ყ'],
							['-','‐','‒']									
			   		];

	""" Convert raw unicode to utf-8 """
	ConfusablesMatrixUnicode = []
	for row in range(0 , len(ConfusableMatrix)):

		tmp = []
		for col in range(0 , len(ConfusableMatrix[row])):
			tmp.append(codecs.lookup('utf8').decode(ConfusableMatrix[row][col])[0])

		ConfusablesMatrixUnicode.append(tmp)
	
	return ConfusablesMatrixUnicode;


def permute(confusion , domain , path , index  , tld , rank):
	"""
	 Permute the given domain by substitutinga visually
	 ambiguous characters by their list of confusables
	"""
	if index >= len(domain):
		""" Base case """
		#print "getting rank"
		curRank = getRanking(toPunycode(path + '.' + tld)[0])
		#print curRank , rank , path , toPunycode(path + '.' + tld)[0] 
		if(curRank < rank):
			return path , True
		return path , False
		#listOfUrls.append( path )
	else:
		#print "finding susp"
		susp = domain[index]
		""" Return list of confusables """
		row = isConfusable(confusion , susp);
		if row > 0:
			row -= 1;

		#print "row" , row
		if row == -1:
			""" If character is not a confusable """
			#print "not confusable"
			newpath = path + susp
			p , y = permute( confusion, domain, newpath, index + 1, tld , rank)
			if y is True:
				return p , True
		else:
			#print "confusable"
			""" If character is confusable """
			for j in range( 0 , len(confusion[row])):
				newpath = path + confusion[row][j]
				#print "spawning"
				p , y = permute(confusion , domain , newpath , index + 1 , tld , rank)
				if y is True:
					return p , y

def isEngChar(c):
	
	if ord(c) in range(97,123):
		return True
	
	return False

def toUnicode(punycode):
	try:
		
		""" Convert punycode to unicode """
		uniUrl = codecs.lookup('idna').decode(punycode)[0]
		return uniUrl , 0
	
	except UnicodeError:
		
		return u'na' , 1

def toPunycode(uniUrl):
	try:
		
		""" Convert punycode to unicode """
		punycode = codecs.lookup('idna').encode(uniUrl)[0]
		return punycode , 0
	
	except UnicodeError:
		
		return 'na' , 1

def isConfusable(confusables , char):
	
	for row in range(0,len(confusables)):
		
		for col in range(0,len(confusables[row])):
			
			if ord(confusables[row][col]) == ord(char):
				return row + 1
	
	return 0

def countEngChars(domain):
	count = 0
	for c in domain:
		if isEngChar(c):
			count += 1
	return count
	
def hasFewConfusables(server):
	""" Check for confusables """
	SPOOF_THRESHOLD = 3
	
	confusables = create_confusables()
	conf_ct = 0
	
	for i in server:
		if isEngChar(i): continue
		if isConfusable(confusables , i):			
			conf_ct += 1
			if(conf_ct > SPOOF_THRESHOLD):
				return False
	return True

def hasMisplacedRange(server):
	uni_ords = []
	THRESHOLD = 100
	EXCEPTIONS = [45]

	for i in server:
		if ord(i) not in EXCEPTIONS:	
			uni_ords.append(ord(i))	
	uni_ords.sort()
	
	left = right = []
	for i in range(0,len(uni_ords)-1):

		if (uni_ords[i+1] - uni_ords[i]) > THRESHOLD:
			left = uni_ords[:i+1]
			right = uni_ords[i+1:]
	m = len(left)
	n = len(right)
	
	if m == 0 or n == 0:
		return False
	#print left , '||' , right
	return True

def isSuspicious(domain):

	domain = domain.split('.')
	server = domain[0]
	tld = domain[1]
	if countEngChars(server) < 2:
		return False

	
	return hasFewConfusables(server)
	# hasMisplacedRange()

	#return hasFewConfusables(server)

def getRanking(url):
	reqUrl = 'http://data.alexa.com/data?cli=10&url=%s' % url
	req  = urllib2.Request(reqUrl)
	response = urllib2.urlopen(req)
	xml = response.read()

	rootElement = ET.XML(xml)
	ranking =  rootElement.find('SD/POPULARITY')
	rank = -1
	if ranking is not None:
		rank = ranking.attrib['TEXT']
	return rank


def do_homograph_check( readfrom ,writeto):
	f_intdom = open(readfrom ,'r')
	f_log = open("log" , 'w')
	f_unidom = codecs.open( writeto , 'w', encoding='utf-8')
	
	confusables = create_confusables()
	ct = 0
	for domain in f_intdom:
		ct += 1
		f_log.write(str(ct) + '\n')
		try:
			domain = domain[0:len(domain) - 1].lower().encode('ascii')
			uniUrl , error = toUnicode(domain)
			if not error:
				a = isSuspicious(uniUrl)
				if a:
					l = []
					#print uniUrl
					rank = getRanking(domain)
					if rank is -1:
						continue
					#print rank , toPunycode(uniUrl)[0] , uniUrl
					server = uniUrl.split('.')[0]
					tld = uniUrl.split('.')[1]
					path , t = permute(	confusables , server , 
									'' , 0  , tld , rank)
					if path is not None:
						print uniUrl , domain , path 
						f_unidom.write( uniUrl + ' ' + domain + '\n')

		except UnicodeError:
			print "Unicode Error"

	f_intdom.close()
	f_unidom.close()

def main():	
	input_file = 'inpbak'
	output_file = 'FINAL_OPT'
	#print getRanking('baidu.com')
	do_homograph_check(input_file , output_file)
			
if __name__ == '__main__': main()
