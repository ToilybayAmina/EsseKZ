export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${url}`, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Сервермен байланыс жоқ. Интернетті тексеріп, қайталаңыз.', 0);
  }
  const data = await response.json().catch(() => ({ error: 'Сервер жауабын оқу мүмкін болмады.' }));
  if (!response.ok)
    throw new ApiError(data.error || 'Сұрауды орындау мүмкін болмады.', response.status);
  return data;
}
export const post = <T>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(body) });
