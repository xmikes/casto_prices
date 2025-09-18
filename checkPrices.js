function getPricesNew() {
  const getProductSku = function () {
    const prodUrlId = window.location.href.split('/').pop();
    return prodUrlId.split('_')[0];
  }

  var psid = getProductSku();
  const prodName = $('h1[data-testid="product-name"]').html().trim();

  chrome.runtime.sendMessage({
    name: 'getAvail',
    ean: psid,
    prodName: prodName
  });

  function getStoresAndPrices(message, sender, sendResponse) {
    if (message.name === 'getAvailResponse') {
      chrome.runtime.onMessage.removeListener(getStoresAndPrices);
      getPricesCont(message.prices, prodName);
    }
  }

  chrome.runtime.onMessage.addListener(getStoresAndPrices);
};

function getPricesCont(prices, prodName) {
  var pricesOrdered = prices.sort();

  chrome.runtime.sendMessage({
    name: 'loadPricesPage',
    productName: prodName,
    pricesList: pricesOrdered
  });
}

getPricesNew();