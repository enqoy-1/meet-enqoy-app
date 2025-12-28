const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const dotenv = require('dotenv');
try { const envConfig = dotenv.parse(fs.readFileSync('.env')); for (const k in envConfig) process.env[k] = envConfig[k]; } catch (e) { }

async function t() {
    const k = process.env.GEMINI_API_KEY;
    const g = new GoogleGenerativeAI(k);
    const ms = ['gemini-2.0-flash', 'gemini-1.5-flash']; // Back to basics
    // Wait, try to list again?
    // No, I want to find ONE that works.

    // Let's try the one that the user SAID they had 429 on? No, 2.5-pro had 429.
    // Try gemini-2.0-flash-exp again?

    const candidates = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash-001'];

    for (const m of candidates) {
        try {
            const mod = g.getGenerativeModel({ model: m });
            await mod.generateContent('Hi');
            console.log(`PASS:${m}`);
            return;
        } catch (e) {
            console.log(`FAIL:${m} ${e.message.split(' ')[0]}`); // Just error code/start
        }
    }
}
t();
