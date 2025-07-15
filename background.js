'use strict';

const apiHost = 'https://api.kingfisher.com/v1/mobile/';
const apiHostV2 = 'https://api.kingfisher.com/v2/mobile/';
const checkAvail = {
  //'Piła': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=53.151132%2C16.738034&page[size]=1000',
  //'Olsztyn': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=53.776684%2C20.476507&page[size]=1000',
  'Warszawa': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=52.231958%2C21.006725&page[size]=1000',
  //'Leszno': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=51.843650%2C16.574414&page[size]=1000',
  //'Częstochowa': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=50.812047%2C19.113213&page[size]=1000',
  //'Rzeszów': 'stores/CAPL?filter[ean]={{ean}}&include=clickAndCollect%2Cstock&nearLatLong=50.037453%2C22.004717&page[size]=1000',
};
const checkPrice = 'products/CAPL?filter[ean]={{ean}}&storeId={{storeId}}'

let currentProgressCollection;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['currentProgressCollection'], (item) => {
    currentProgressCollection = item.currentProgressCollection || [];
  });
});

function updatePopupForTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab?.url?.includes('castorama.pl')) {
      chrome.action.setPopup({ tabId, popup: 'popup.html' });
      chrome.action.setIcon({ tabId, path: 'logo16.png' });
    } else {
      chrome.action.setPopup({ tabId, popup: '' });
      chrome.action.setIcon({ tabId, path: 'logo16inactive.png' });
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updatePopupForTab(tabId);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  updatePopupForTab(tabId);
});

const getUrl = function (ean, city) {
  const url = `${apiHost}` + checkAvail[city];
  return url.replace('{{ean}}', ean);
}

const getAvail = (ean, prodName, tabId, sendResponse) => {
  const storeList = [];
  let completedCount = 0;

  Object.keys(checkAvail).forEach(city => {
    console.log(`CITY: ${city}`);
    const request = new Request(getUrl(ean, city), {
      method: 'GET',
      headers: {
        Authorization: 'Atmosphere atmosphere_app_id=kingfisher-EPgbIZbIpBzipu0bKltAFm1xler30LKmaF4vJH96'
      }
    });

    const promise = fetch(request).then(function (res) {
      console.log(`STATUS: ${res.status}`);

      var jsonPromise = res.json();

      jsonPromise.then(function (val) {
        val.data.forEach(d => {
          if (storeList.indexOf(d.id) === -1 && d.attributes.stock.products[0].quantity > 0) {
            storeList.push({
              id: d.id,
              qty: d.attributes.stock.products[0].quantity,
              storeName: d.attributes.store.name
            });
          }
        });
        completedCount++;
      }).catch(error => {
        console.log(`problem with request: ${error.message}`);
      });
    }).catch(error => {
      console.log(`problem with request: ${error.message}`);
    });
  });

  const interval = setInterval(() => {
    if (completedCount === Object.keys(checkAvail).length) {
      clearInterval(interval);
      getPrices(tabId, ean, prodName, storeList, sendResponse);
    }
  }, 500);
};

const getPriceUrl = function (ean, storeId) {
  const url = `${apiHostV2}` + checkPrice;
  return url.replace('{{ean}}', ean).replace('{{storeId}}', storeId);
}

function getPrices(tabId, ean, prodName, storeList, sendResponse) {
  const prices = [];
  const allStoresCount = storeList.length;
  let processedStores = 0;

  function padStart(str) {
    if (str.length < 8) {
      var missings = new Array(8 - str.length);
      return missings.fill(' ').join('') + str;
    }
    return str;
  }

  function padEnd(str) {
    if (str.length < 2) {
      var missings = new Array(2 - str.length);
      return str + missings.fill('0').join('');
    }
    return str;
  }

  const getPriceForOne = () => {
    if (storeList.length <= 0) {
      console.log('finish');
      setTimeout(() => {
        chrome.tabs.sendMessage(
          tabId,
          {
            name: 'getAvailResponse',
            prices: prices
          }
        );
      }, 200);
      sendResponse();
      return;
    }

    const store = storeList.pop();

    const request = new Request(getPriceUrl(ean, store.id), {
      method: 'GET',
      headers: {
        Authorization: 'Atmosphere atmosphere_app_id=kingfisher-EPgbIZbIpBzipu0bKltAFm1xler30LKmaF4vJH96'
      }
    });

    fetch(request).then(function (res) {
      const statusCode = res.status;
      const contentType = res.headers.get('content-type');

      if (statusCode !== 200) {
        throw new Error('Request Failed.\n' +
          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        throw new Error('Invalid content-type.\n' +
          `Expected application/json but received ${contentType}`);
      }

      var jsonPromise = res.json();

      jsonPromise.then(function (val) {
        const attr = val.data[0].attributes;
        var price = attr.pricing.currentPrice.amountIncTax.toString();
        var priceA = padStart(price.split('.')[0]);
        var priceB = padEnd(price.split('.')[1] || '');

        prices.push('<b>' + priceA + '.' + priceB + '</b> ' + store.storeName + ' - ' + store.qty + ' sztuk');
        processedStores++;

        // Status update START
        chrome.storage.local.get(['currentProgressCollection'], (item) => {
          let currentProgressCollection = item.currentProgressCollection || [];

          if (allStoresCount === processedStores) {
            currentProgressCollection = currentProgressCollection.filter(item => item.name !== prodName);
          } else {
            let currentProgressItem = currentProgressCollection.find(i => i.name === prodName);

            if (!currentProgressItem) {
              currentProgressItem = {
                name: prodName,
                all: allStoresCount
              };
              currentProgressCollection.push(currentProgressItem);
            }

            currentProgressItem.ready = processedStores;
          }

          chrome.storage.local.set({ currentProgressCollection });
        });
        // Status update END

        setTimeout(getPriceForOne, 50);
      }).catch(error => {
        console.log(`problem with GET request: ${error.message}`);
      });
    }).catch(error => {
      console.log(`problem with GET request: ${error.message}`);
    });
  };

  setTimeout(getPriceForOne, 50);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name === 'loadPricesPage') {
    chrome.storage.local.set({
      pricesList: message.pricesList,
      productName: message.productName
    }, () => {
      chrome.tabs.create({
        active: true,
        url: 'prices.html',
        index: sender.tab.index + 1
      });
    });
  }

  if (message.name === 'getAvail') {
    getAvail(message.ean, message.prodName, sender.tab.id, sendResponse);
    return true;
  } 
});
