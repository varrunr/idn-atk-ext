# coding: utf-8
import codecs

def create_confusables():
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

def toUnicode(punycode):
	
	try:

		""" Convert punycode to unicode """
		uniUrl = codecs.lookup('idna').decode(punycode)[0]
		return uniUrl
	
	except UnicodeError:
		return 'Bad Punycode'

def isConfusable(conf , char):
	for row in range(0,len(conf)):
		for col in range(0,len(conf[row])):
			if conf[row][col] == char:
				return row
	
	return 0

def isSuspicious(domain):
	return True

def read_file(filename):
	
	f_intdom = open(filename,'r')
	f_unidom = codecs.open('UNIDOM', 'w', encoding='utf-16')
	
	for domain in f_intdom:
		try:
			
			domain = domain[0:len(domain) - 1].lower().encode('ascii')
			uniUrl = toUnicode(domain)
			
			if isSuspicious(domain):
				f_unidom.write( uniUrl + '\n')
		
		except UnicodeError:
			print "Unicode Error"

	f_intdom.close()
	f_unidom.close()

def main():	
	confusables = create_confusables()
	read_file('inp')

if __name__ == '__main__': main()
