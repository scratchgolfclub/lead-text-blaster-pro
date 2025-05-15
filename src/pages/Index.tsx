
import React from 'react';
import ZapierWebhook from '@/components/ZapierWebhook';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Lead Text Messenger</h1>
          <p className="text-gray-500">Send text messages to leads via MightyCall API</p>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ZapierWebhook />
        </div>
      </main>
      <footer className="bg-white shadow mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Lead Text Messenger - Powered by MightyCall API
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
