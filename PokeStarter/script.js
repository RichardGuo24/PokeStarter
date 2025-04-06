async function getResponse()
{
    const promptText = document.getElementById("prompt").value.trim();
    const budgetValue = document.getElementById("budget").value.trim();
    const outputDiv = document.getElementById("output");

    // Clear previous output and show a loading message
    outputDiv.innerHTML = "<p>Thinking...</p>";

    // Input validation
    if (!promptText || !budgetValue || isNaN(budgetValue) || Number(budgetValue) <= 0)
    {
        outputDiv.innerHTML = "<p style='color:red;'>Please enter a prompt and a valid budget greater than $0.</p>";
        return;
    }

    try
    {
        const response = await fetch("http://localhost:3000/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: promptText,
                budget: parseFloat(budgetValue)
            })
        });

        const data = await response.json();

        const cleanedReply = data.reply
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold text
            .replace(/1\.\s/g, "<h4>1️⃣ Tip 1:</h4>")
            .replace(/2\.\s/g, "<h4>2️⃣ Tip 2:</h4>")
            .replace(/3\.\s/g, "<h4>3️⃣ Tip 3:</h4>")
            .replace(/\*\*Recommendations\*\*/g, "<h4>🔥 Recommendations:</h4>")
            .replace(/\n/g, "<br>");

        outputDiv.innerHTML = `
        <h3>💬 PokeStarter Suggestions</h3>
        <div style="padding: 1rem; background: #f9f9f9; border-radius: 8px;">
          <div>${cleanedReply}</div>
        </div>
      
  
        <h3>📇 Card Picks:</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            ${data.cards.map(card => `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; background: #fff;">
                <h4 style="margin-top: 0;">${card.name}</h4>
                <p><strong>Set:</strong> ${card.set}</p>
                <p><strong>Price:</strong> $${card.price.toFixed(2)}</p>
                <a href="${card.url}" target="_blank" style="color: #007bff;">Buy this card</a>
                ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}" style="width: 100%; margin-top: 10px;" />` : ''}
            </div>
            `).join("")}
        </div>
        `;
        if (data.cards.length === 0)
        {
            outputDiv.innerHTML += `
              <div style="margin-top: 1.5rem; text-align: center;">
                <a href="https://www.tcgplayer.com/search/pokemon/product?q=booster%20box" target="_blank" style="text-decoration: none;">
                  <button style="padding: 0.75rem 1.25rem; background: #ffcc00; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    🛒 Browse Booster Boxes on TCGPlayer
                  </button>
                </a>
              </div>
            `;
        }
    } catch (error)
    {
        outputDiv.innerHTML = `<p style="color:red;">Something went wrong. Please check your server or try again.</p>`;
        console.error("Error contacting backend:", error);
    }
}