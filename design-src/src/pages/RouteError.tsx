import React from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export default function RouteError() {
  const error: unknown = useRouteError();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred.';
  let details: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    const d = error.data as { message?: string } | string | undefined;
    message = typeof d === 'string' ? d : (d?.message ?? message);
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full border rounded-lg p-6 bg-card text-card-foreground shadow">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm mb-4">{message}</p>
        {details && (
          <details className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-3">
            <summary className="cursor-pointer mb-2">Stack trace</summary>
            {details}
          </details>
        )}
        <div className="mt-4 flex gap-2">
          <Link to="/" className="border rounded px-3 py-2 text-sm">Go Home</Link>
        </div>
      </div>
    </div>
  );
}
