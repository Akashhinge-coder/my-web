const fetch = require("node-fetch");

async function test() {
  const text = "paneer tikka masala";
  const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
