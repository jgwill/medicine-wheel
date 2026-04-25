declare module '@neondatabase/serverless' {
  export type NeonQueryFunction = (
    strings: TemplateStringsArray,
    ...params: unknown[]
  ) => Promise<Record<string, unknown>[]>;

  export function neon(connectionString: string): NeonQueryFunction;
}
