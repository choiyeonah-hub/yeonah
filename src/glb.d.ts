declare module "*.glb" {
  /** esbuild 의 base64 로더가 넘겨주는 문자열 (data: URL 이 아니다) */
  const base64: string;
  export default base64;
}
