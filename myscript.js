function isSpoofed(url)
{
	return false;
}

function checkForSpoofedUrl(tabId, changeInfo, tab)
{
	// If url contains a 'z'
	if (tab.url.indexOf('z') > -1) 
	{	
    	if ( isSpoofed(tab.url) )
    	{
    		chrome.tabs.update(tabId, {url:"chrome://newtab"});
    	}
  	}  
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForSpoofedUrl);
