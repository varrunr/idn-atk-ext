/*! http://mths.be/punycode by @mathias */
/*
s=2147483647,l=36,n=1,q=26,i=38,m=700,o=72,h=128,G='-',d=/[^ -~]/,v=/^xn--/,r={overflow:'Overflow: input needs wider integers to process.',ucs2decode:'UCS-2(decode): illegal sequence',ucs2encode:'UCS-2(encode): illegal value','not-basic':'Illegal input >= 0x80 (not a basic code point)','invalid-input':'Invalid input'},g=l-n,B=Math.floor,x=String.fromCharCode,H;function z(J){throw RangeError(r[J])}function E(L,J){var K=L.length;while(K--){L[K]=J(L[K])}return L}function c(J,K){var L='.';return E(J.split(L),K).join(L)}function k(M){var L=[],K=0,N=M.length,O,J;while(K<N){O=M.charCodeAt(K++);if((O&63488)==55296){J=M.charCodeAt(K++);if((O&64512)!=55296||(J&64512)!=56320){z('ucs2decode')}O=((O&1023)<<10)+(J&1023)+65536}L.push(O)}return L}function D(J){return E(J,function(L){var K='';if((L&63488)==55296){z('ucs2encode')}if(L>65535){L-=65536;K+=x(L>>>10&1023|55296);L=56320|L&1023}K+=x(L);return K}).join('')}function f(J){return J-48<10?J-22:J-65<26?J-65:J-97<26?J-97:l}function w(K,J){return K+22+75*(K<26)-((J!=0)<<5)}function b(M,K,L){var J=0;M=L?B(M/m):M>>1;M+=B(M/K);for(;M>g*q>>1;J+=l){M=B(M/g)}return B(J+(g+1)*M/(M+i))}function C(K,J){K-=(K-97<26)<<5;return K+(!J&&K-65<26)<<5}function u(W){var M=[],P=W.length,R,S=0,L=h,T=o,O,Q,U,K,X,N,V,Z,J,Y;O=W.lastIndexOf(G);if(O<0){O=0}for(Q=0;Q<O;++Q){if(W.charCodeAt(Q)>=128){z('not-basic')}M.push(W.charCodeAt(Q))}for(U=O>0?O+1:0;U<P;){for(K=S,X=1,N=l;;N+=l){if(U>=P){z('invalid-input')}V=f(W.charCodeAt(U++));if(V>=l||V>B((s-S)/X)){z('overflow')}S+=V*X;Z=N<=T?n:(N>=T+q?q:N-T);if(V<Z){break}Y=l-Z;if(X>B(s/Y)){z('overflow')}X*=Y}R=M.length+1;T=b(S-K,R,K==0);if(B(S/R)>s-L){z('overflow')}L+=B(S/R);S%=R;M.splice(S++,0,L)}return D(M)}function j(V){var M,X,S,K,T,R,N,J,Q,Z,W,L=[],P,O,Y,U;V=k(V);P=V.length;M=h;X=0;T=o;for(R=0;R<P;++R){W=V[R];if(W<128){L.push(x(W))}}S=K=L.length;if(K){L.push(G)}while(S<P){for(N=s,R=0;R<P;++R){W=V[R];if(W>=M&&W<N){N=W}}O=S+1;if(N-M>B((s-X)/O)){z('overflow')}X+=(N-M)*O;M=N;for(R=0;R<P;++R){W=V[R];if(W<M&&++X>s){z('overflow')}if(W==M){for(J=X,Q=l;;Q+=l){Z=Q<=T?n:(Q>=T+q?q:Q-T);if(J<Z){break}U=J-Z;Y=l-Z;L.push(x(w(Z+U%Y,0)));J=B(U/Y)}L.push(x(w(J,0)));T=b(X,O,S==K);X=0;++S}}++X;++M}return L.join('')}function t(J){return c(J,function(K){return v.test(K)?u(K.slice(4).toLowerCase()):K})}function F(J){return c(J,function(K){return d.test(K)?'xn--'+j(K):K})};

function toUnicode(url)
{
	return t(url);
}
*/

function isSpoofed(uniUrl){
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
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForSpoofedUrl);
