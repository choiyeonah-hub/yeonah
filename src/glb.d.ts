declare module "*.glb" {
  /** esbuild 의 dataurl 로더가 넘겨주는 data: URL */
  const url: string;
  export default url;
}
