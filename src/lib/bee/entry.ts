// 단일 HTML 빌드의 진입점. Next 페이지는 mount() 를 직접 부른다.
import { mount } from "./standalone";

const el = document.getElementById("app");
// 3D 번들과 모델은 이 HTML 과 같은 폴더에 놓인다.
if (el) mount(el, { wedding3dBase: "./" });
