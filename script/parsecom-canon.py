# coding: utf-8
import codecs
import urllib
import urllib2
import xml.etree.ElementTree as ET
import sys
import time

dot_com_uniurl = []
dot_com_punyurl = []

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
							['l','ɩ'],
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

def load_uniurls(readfrom, writeto, log):
    f_intdom = open(readfrom ,'r')
    if log:
	    f_log = open("log" , 'w')
    if writeto is not None:
        f_unidom = codecs.open( writeto , 'w', encoding='utf-8')
	
	confusables = create_confusables()
	ct = 0
    for domain in f_intdom:
        if log:
            f_log.write(str(ct) + '\n')
        try:
            domain = domain[0:len(domain) - 1].lower().encode('ascii')
            uniUrl , error = toUnicode(domain)
            if not error:
                dot_com_punyurl.append(domain)
                dot_com_uniurl.append(uniUrl)
                
                if writeto is not None:
				    f_unidom.write( uniUrl + '\n')

        except UnicodeError:
		    print "Unicode Error"
    f_intdom.close()
    if writeto is not None:
	    f_unidom.close()
    return

def canonicalize_char(c , confusables):
    flag = False
    for i in range(0,len(confusables)):
        for j in range(0,len(confusables[i])):
            if confusables[i][j] == c:
                conf_row = confusables[i]
                flag = True
                break
    
    if not flag: return c
    
    min_ord = ord(conf_row[0])
    min_c = conf_row[0]

    for i in conf_row:
        if ord(i) < min_ord:
            min_c = i
            min_ord = ord(i)

    return min_c

def canonicalize_str(uni_str):
    canon_uni_str = ''
    for c in uni_str:
        canon_uni_str += canonicalize_char(c , create_confusables())
    return canon_uni_str

def canonical_cmp(a,b):
    a = canonicalize_str(a)
    b = canonicalize_str(b)
    if a == b: return 0
    if a <  b: return -1
    return 1
        
def writelist(f,l):
    for i in l:
        f.write(i+'\n')

def main():
    
    input_file = './data/testcase'
    if len(sys.argv) > 1:
        input_file = str(sys.argv[1])
    else:
        print "Please specify an input file"
        return
    
    print "Timing started"
    start_time = time.time()
    
    sorted_out_file = './data/sorted_output'
    unsorted_out_file = './data/unsorted_output'
    attack_file = './data/attack_file'

    print """ Open files for writing """
    f_sorted = codecs.open( sorted_out_file , 'w', encoding='utf-8')
    f_unsorted = codecs.open( unsorted_out_file , 'w', encoding='utf-8')
    f_attack = codecs.open( attack_file , 'w' , encoding='utf-8')
    
    print """ Load urls and convert to unicode """
    load_uniurls(input_file, None , False)
    
    print """ Write unsorted data """
    writelist(f_unsorted , dot_com_uniurl)
    f_unsorted.close()

    print """ Sort database of urls using custom comparator """
    dot_com_uniurl.sort(cmp=canonical_cmp)
    
    print """ Write sorted data """
    writelist(f_sorted , dot_com_uniurl)
    f_sorted.close()
    
    print """ Detect attacks \n"""
    for i in range(0,len(dot_com_uniurl)-1):
        if canonicalize_str(dot_com_uniurl[i]) == canonicalize_str(dot_com_uniurl[i+1]):
            msg =  "ATTACK: %s ; %s" % ( dot_com_uniurl[i] , dot_com_uniurl[i+1] )
            f_attack.write(msg + "\n")
    
    end_time = time.time()
    time_taken = (end_time - start_time) / 3600 
    print "\n -- TIME TAKEN : %f minutes-- \n " % time_taken
    print """THE END"""
    
    return
    
if __name__ == '__main__': main()
