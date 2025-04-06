// server.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const TCG_API_KEY = process.env.TCG_API_KEY;

// 🔍 GPT-powered keyword extraction
async function extractPokemonName(prompt)
{
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content:
                    "Extract the most relevant Pokémon-related keyword or product type from this question (like 'Charizard', 'booster box', 'Elite Trainer Box', etc). Return only one word or short phrase. No explanation.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.3,
    });

    const keyword = completion.choices[0].message.content.trim().toLowerCase();
    return keyword === "pokemon" ? "booster" : keyword;
}

// 🧠 Get cards from TCG API under budget
async function getCardsUnderBudget(keyword, budget)
{
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${keyword}`, {
        headers: {
            "X-Api-Key": TCG_API_KEY,
        },
    });

    const data = await res.json();

    return data.data
        .filter((card) =>
        {
            const price = card?.tcgplayer?.prices?.normal?.market;
            return price && price <= budget;
        })
        .map((card) => ({
            name: card.name,
            set: card.set.name,
            price: card.tcgplayer.prices.normal.market,
            url: card.tcgplayer.url,
            imageUrl: card.images?.small || null,
        }))
        .slice(0, 3);
}

// 💬 Main AI route
app.post("/ask", async (req, res) =>
{
    const { prompt, budget } = req.body;

    // Step 1: Dynamically extract keyword
    const keyword = await extractPokemonName(prompt);

    // Step 2: Determine if they asked for sealed products
    let cards = [];
    let useBoosterLogic = false;

    if (
        ["booster", "booster box", "box", "sealed", "etb", "elite trainer"].some((k) =>
            keyword.includes(k)
        )
    )
    {
        useBoosterLogic = true;
    } else
    {
        cards = await getCardsUnderBudget(keyword, budget);
    }

    // Step 3: Prepare GPT prompt
    let chatPrompt;

    if (useBoosterLogic)
    {
        chatPrompt = `The user wants help finding Pokémon sealed products (like booster boxes or Elite Trainer Boxes) under $${budget}.

Their question: "${prompt}"

Give 3 beginner-friendly recommendations of sealed products or booster boxes that are under budget. Mention the set and a rough price estimate. Avoid made-up products.`;
    } else
    {
        const suggestionsText = cards
            .map((c) => `- ${c.name} (${c.set}) - $${c.price.toFixed(2)}`)
            .join("\n");

        chatPrompt = `The user wants help finding Pokémon cards under $${budget}.

Their question: "${prompt}"

Here are cards available:
${suggestionsText}

Give 3 beginner-friendly tips and recommend 1–2 cards from the list.`;
    }

    // Step 4: Get GPT response
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content:
                    "You're an expert in Pokémon card collecting. Give beginner-friendly advice that's clear and actionable.",
            },
            { role: "user", content: chatPrompt },
        ],
        temperature: 0.7,
    });

    // Step 5: Return AI response + cards (if applicable)
    res.json({
        reply: completion.choices[0].message.content,
        cards,
    });
});

// 🚀 Start server
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
