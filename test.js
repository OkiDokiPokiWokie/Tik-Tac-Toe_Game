const Groq = require('groq-sdk');

console.log("🔍 Starting Groq API Test...\n");

// 1. Verify the key exists in the current environment
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: GROQ_API_KEY is undefined!");
    console.error("The terminal cannot see your Replit Secret. Make sure you spelled the Secret key exactly as GROQ_API_KEY.");
    process.exit(1); 
} else {
    // We only print the length/first few chars to keep it secure!
    console.log(`✅ API Key found in environment variables! (Starts with: ${apiKey.substring(0, 8)}...)`);
}

// 2. Initialize the Groq SDK
const groq = new Groq({ apiKey: apiKey });

// 3. Make a dead-simple test call
async function runTest() {
    console.log("⏳ Sending test ping to Groq using model 'llama3-8b-8192'...");

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "user", content: "Respond with exactly two words: 'Connection successful!'" }
            ],
            model: "llama-3.1-8b-instant",
        });

        console.log("\n🎉 SUCCESS! Groq is working perfectly.");
        console.log("🤖 AI Response:", completion.choices[0]?.message?.content);

    } catch (error) {
        console.error("\n❌ GROQ API CALL FAILED!");
        console.error("--------------------------------------------------");
        console.error("Error Status Code:", error.status);
        console.error("Error Name:", error.name);
        console.error("Full Error Message:", error.message);
        console.error("--------------------------------------------------");
    }
}

runTest();