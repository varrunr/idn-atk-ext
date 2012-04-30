function isSpoofed(url)
{
	return true;
}

function getAcceptLanguages() {
  chrome.i18n.getAcceptLanguages(function(languageList) {
    var languages = languageList.join(",");
    alert(languages);
    setChildTextNode('languageSpan',
        chrome.i18n.getMessage("chrome_accept_languages", languages));
  })
}

function checkForSpoofedUrl(tabId, changeInfo, tab)
{
	// If url contains a 'z'
	//alert(tab.url);
	if (tab.url.indexOf('x') > -1) 
	{
    	if ( isSpoofed(tab.url) )
    	{
    		chrome.tabs.update(tabId, {url:"chrome://newtab"});
    	}
  	}  
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForSpoofedUrl);
