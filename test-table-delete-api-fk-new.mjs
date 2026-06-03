async function main() {
  const tableId = "d79cf3c4-873e-45ab-a024-4c1a2e59ab33";
  const url = `http://localhost:3001/api/v1/tables/${tableId}`;
  
  console.log(`Sending DELETE to ${url}...`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    }
  });
  
  console.log("Status:", response.status);
  try {
    const json = await response.json();
    console.log("Body:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Failed to read body as JSON", err);
  }
}

main().catch(console.error);
