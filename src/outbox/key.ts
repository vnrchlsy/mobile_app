// US-O3 · the compose-time idempotency key.
//
// `expo-crypto` would be another native module for one function; a v4-shaped id from
// Math.random is sufficient here because the key's job is UNIQUENESS PER REPORTER, not
// unguessability — the server scopes its lookup to the caller, so a guessed key belonging to
// someone else is useless (see the DDL comment on stray_report.idempotency_key).
export function randomKey(): string {
  const hex = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, "0");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${((Math.random() * 4) | 8).toString(16)}${hex(3)}-${hex(12)}`;
}
