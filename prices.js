'use strict';

chrome.storage.local.get(['pricesList', 'productName'], (data) => {
  if (!data.productName || !data.pricesList) {
  document.getElementsByClassName('content')[0].innerHTML = 'No data found.';
  document.title = 'No data found.';
    return;
  }
  
  var html = `
    <p style="font: 25px monospace; white-space: pre;">${data.productName}</p>
    <p style="font: 15px monospace; white-space: pre;">${data.pricesList.join('<br/>')}</p>`;

  document.getElementsByClassName('content')[0].innerHTML = html;
  document.title = 'Prices for: ' + data.productName;
});
