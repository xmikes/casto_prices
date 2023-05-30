
function test() {
  const elem = $('[data-test-id="productDescriptionPage"]');
  return elem.length === 1;
}

test();