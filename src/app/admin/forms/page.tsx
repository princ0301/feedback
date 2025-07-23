'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type FeedbackForm = {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
};

export default function FormsPage() {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchForms() {
      try {
        const res = await fetch('/api/forms');
        const data = await res.json();
        setForms(data);
      } catch (error) {
        console.error('Error fetching forms:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, []);

  if (loading) {
    return <p className="text-center mt-10 text-gray-500">Loading forms...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">All Feedback Forms</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {forms.map((form) => (
          <div key={form.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{form.title}</h2>
            <p className="text-sm text-gray-500">
              {form.description || 'No description provided.'}
            </p>
            {form.created_at && (
              <p className="text-xs text-gray-400 mt-2">
                Created: {new Date(form.created_at).toLocaleDateString()}
              </p>
            )}

            <div className="mt-4 flex gap-3">
              <Link
                href={`/admin/forms/${form.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                View Form
              </Link>

              <button
                onClick={() => router.push(`/admin/forms/${form.id}/summary`)}
                className="ml-auto inline-block text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition"
              >
                Generate Summary
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
