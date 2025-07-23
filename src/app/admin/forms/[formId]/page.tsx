import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

interface Params {
  params: {
    formId: string;
  };
}

export default async function FormDetailsPage(context: Params) {
  const { formId } = await context.params; 

  const client = await pool.connect();

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

  const { rows } = await client.query(query, [formId]);
  client.release();

  // Group responses
  const grouped: Record<string, { createdAt: string; answers: { order: number; question: string; answer: string }[] }> = {};

  for (const row of rows) {
    const id = row.response_id;
    if (!grouped[id]) {
      grouped[id] = {
        createdAt: row.createdAt,
        answers: [],
      };
    }
    grouped[id].answers.push({
      order: row.question_order,
      question: row.question,
      answer: row.answer,
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Form Responses</h1>

      {Object.entries(grouped).map(([responseId, { createdAt, answers }]) => (
        <div key={responseId} className="border rounded-lg p-4 mb-6 shadow">
          <p className="text-sm text-gray-500 mb-2">🧾 Response ID: {responseId}</p>
          <p className="text-sm text-gray-500 mb-4">🕒 Submitted At: {new Date(createdAt).toLocaleString()}</p>
          <ul className="space-y-2">
            {answers.map(({ order, question, answer }) => (
              <li key={order}>
                <strong>{order}. {question}</strong>
                <div className="ml-4 text-gray-800">{answer}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
