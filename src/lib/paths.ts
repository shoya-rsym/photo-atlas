const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** public 配下の静的ファイルへのパスに basePath を付与する */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
