const fetch = require('node-fetch');

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test-session-id',
        restaurantId: 'test-restaurant-id',
        amount: 100,
        currency: 'INR',
        billSnapshot: {},
        sessionVersion: 1
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

run();
