function getProdName() {
  const title = $('#product-title').html();
  return title && title.trim();
}

getProdName();