// E:\feedback\src\app\api\forms\[formId]\summary\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from 'langchain/chains';

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Be cautious with rejectUnauthorized: false in production
});

// Define the GET handler for the API route
export async function GET(req: NextRequest, context: { params: { formId: string } }) {
  try {
    // IMPORTANT: Await context.params before accessing its properties in Route Handlers.
    // This ensures that dynamic parameters are fully resolved.
    const { formId } = await context.params; 

    // Check if formId is provided
    if (!formId) {
      return NextResponse.json({ error: 'Missing formId' }, { status: 400 });
    }

    // Connect to the database
    const client = await pool.connect();

    // SQL query to fetch feedback responses and their associated questions and answers
    const query = `
      SELECT
          r.id AS response_id,
          r."createdAt",
          q."order" AS question_order,
          q.question,
          a.answer
      FROM "FeedbackResponse" r
      JOIN "Answer" a ON r.id = a."responseId"
      JOIN "FeedbackQuestion" q ON a."questionId" = q.id
      WHERE r."formId" = $1
      ORDER BY r."createdAt" DESC, q."order" ASC
    `;

    // Execute the query with the formId
    const { rows } = await client.query(query, [formId]);
    client.release(); // Release the client back to the pool

    // If no responses are found, return a 404
    if (!rows.length) {
      return NextResponse.json({ message: 'No responses found.' }, { status: 404 });
    }

    // Group responses by response ID
    const grouped: Record<string, string[]> = {};
    const timestamps: Record<string, string> = {};

    for (const row of rows) {
      const key = row.response_id;
      if (!grouped[key]) {
        grouped[key] = [];
        timestamps[key] = row.createdAt;
      }
      grouped[key].push(`${row.question_order}. ${row.question} → ${row.answer}`);
    }

    // Format all feedback into a single text string for the LLM
    let allFeedbackText = '';
    for (const [id, answers] of Object.entries(grouped)) {
      allFeedbackText += `🧾 Response ID: ${id}\n🕒 Submitted At: ${timestamps[id]}\n`;
      allFeedbackText += answers.join('\n') + '\n\n';
    }

    // Define the prompt template for the LLM
    const prompt = new PromptTemplate({
      inputVariables: ['feedback'],
      template: `
You are a professional summarization assistant. The following is feedback collected from multiple reviewers about different students as part of a company feedback form.

The questions and answers may vary across entries.

Your task:
- Analyze the responses collectively.
- Identify common themes or trends in feedback.
- Mention frequently observed strengths, weaknesses, behavior, professionalism, and recommendations.
- Highlight insights like most common ratings, general satisfaction, and areas students typically excel or struggle in.

Feedback:
-----------------------
{feedback}
-----------------------

Generate a detailed, structured summary that can be used in a report to the academic coordinator. Use a formal tone.
`,
    });

    // Initialize the LLM (Groq in this case)
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!, // Ensure GROQ_API_KEY is set in your .env file
      model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Specify the model
      temperature: 0.3, // Set temperature for creativity
    });

    // Create an LLMChain to run the prompt with the model
    const chain = new LLMChain({ llm: model, prompt });
    // Run the chain to get the summary
    const summary = await chain.run({ feedback: allFeedbackText });

    // Return the generated summary as a JSON response
    return NextResponse.json({ summary });
  } catch (err) {
    // Log any errors and return a 500 status
    console.error('Summary generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
