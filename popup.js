
const msg = document.getElementById('message');
const desc = document.getElementById('desc');

let cleanClick = false;
let currentProgressCollection;

chrome.storage.local.get(['currentProgressCollection'], item => {
  currentProgressCollection = item.currentProgressCollection || [];
});

function getCurrentTab(callback) {
  let queryOptions = { active: true, lastFocusedWindow: true };
  chrome.tabs.query(queryOptions, ([tab]) => {
    if (chrome.runtime.lastError)
      console.error(chrome.runtime.lastError);
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    callback(tab);
  });
}

function displayValidMsg(extraScript) {
  getCurrentTab(tab => {
    if (!tab || !tab.url || tab.url.indexOf('www.castorama.pl') === -1) {
      msg.innerHTML = 'Przejdź&nbsp;na <a target="_blank" href="https://www.castorama.pl">www.castorama.pl</a>';
    } else {
      
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['jquery-3.6.0.slim.js']
      }).then(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['testProductPage.js']
        }).then((data) => {
          if (data?.[0]?.result) {
            msg.innerHTML = 'Proszę&nbsp;czekaj...';
            if (extraScript) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: [extraScript]
              });
            }
          } else {
            msg.innerHTML = 'Przejdź&nbsp;na stronę&nbsp;produktu!';
          }
        });
      });
    }
  });
}

function clearItems() {
  cleanClick = true;
  currentProgressCollection = [];
  chrome.storage.local.set({ currentProgressCollection });
};

setInterval(() => {
  chrome.storage.local.get(['currentProgressCollection'], item => {
    currentProgressCollection = item.currentProgressCollection || [];

    if (currentProgressCollection.length === 0) {
      desc.innerHTML = '';

      if (cleanClick) {
        msg.innerHTML = '...';
      } else {
        displayValidMsg();
      }

      return;
    };

    cleanClick = false;
    const descHTML = [];

    currentProgressCollection.forEach(item => {
      descHTML.push(`&#10140; ${item.name} - <b>${item.ready}/${item.all}</b>`.replace(/\s/g, '&nbsp;'));
    });

    descHTML.push(`<br/><a href="#" id="cleanAll" style="font-size: 0.8em">wyczyść</a> <i style="font-size: 0.7em">(w razie gdy proces się zatrzyma)</i>`);

    msg.innerHTML = 'Proszę&nbsp;czekaj...';
    desc.innerHTML = descHTML.join('<br/>');

    const cleanAllLink = document.getElementById('cleanAll');
    cleanAllLink.addEventListener("click", () => clearItems());
  });
}, 500);


getCurrentTab(tab => {
  if (!tab.url || tab.url.indexOf('www.castorama.pl') === -1) {
    msg.innerHTML = 'Przejdź&nbsp;na <a target="_blank" href="https://www.castorama.pl">www.castorama.pl</a>';
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['jquery-3.6.0.slim.js']
  }).then(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['getProdName.js']
    }).then((prodNameRes) => {
      const prodName = prodNameRes?.[0].result;

      if (!prodName || currentProgressCollection.some(item => item.name === prodName)) {
        return;
      };

      displayValidMsg('checkPrices.js');
    });
  });
});
