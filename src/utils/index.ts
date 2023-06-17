/**
 * 创建唯一 id
 * @returns id
 */
export function createId() {
  /*
    Math.random(): 生成一个0到1之间的随机浮点数。范围在 0（包括）到 1（不包括）之间。
    toString(36): 将数字转换为一个 36 进制的字符串。参数 36 表示将数字转换为 0-9 以及 a-z 的字符。
    substring(2): 去掉字符串的前两个字符。
  */
  return Math.random().toString(36).slice(2)
}
