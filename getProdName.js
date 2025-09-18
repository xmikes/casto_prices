function getProdName() {
  const titles = $('h1[data-testid="product-name"]');
  if (titles.length !== 1) {
    return '';
  }
  const title = titles[0].innerHTML;
  return title && title.trim();
}

getProdName();