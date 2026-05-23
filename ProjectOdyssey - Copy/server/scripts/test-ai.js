async function run(message) {
  const res = await fetch("http://localhost:4000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, userContext: null, selectedPlaces: [] }),
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run("make a 2 day itinerary for Rome");
