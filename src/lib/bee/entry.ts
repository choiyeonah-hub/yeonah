// 단일 HTML 빌드의 진입점. Next 페이지는 mount() 를 직접 부른다.
import { mount } from "./standalone";

const el = document.getElementById("app");
if (el) mount(el);
