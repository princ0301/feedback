// components/FormList.tsx

import React from 'react';

type FeedbackForm = {
  id: string;
  title: string;
  created_at: string; // or Date
};

interface Props {
  forms: FeedbackForm[];
}

const FormList: React.FC<Props> = ({ forms }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {forms.map((form) => (
        <div
          key={form.id}
          className="bg-white rounded-2xl shadow-md hover:shadow-lg transition duration-300 p-6 border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800">{form.title}</h2>
          <p className="text-sm text-gray-500 mt-2">
            Created at: {new Date(form.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default FormList;
