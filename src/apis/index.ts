// 获取模板 html 字符串
export function getTemplateStrAPI() {
  return fetch('/html/template.html').then((res) => res.text())
}
