async function main() {
  const tableId = "d6e87e48-3712-402e-b1c4-d968d8c4e0e3";
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
    const text = await response.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Failed to read body", err);
  }
}

main().catch(console.error);
