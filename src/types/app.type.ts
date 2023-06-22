import { ETagType } from '@/enums/app.enum'
import type { CSSProperties } from 'vue'

/* 标签类型。说明：typeof ETagType 将枚举转成 type 类型；keyof 获取 type 类型中所有 key 组成联合类型 */
export type TTagType = keyof typeof ETagType

/* 下拉选择项 */
export type TOption = {
  // 选择项主键
  id: string
  // 选择项文本
  label: string
  // 选择项文本对应的值（当不提供 value 时，下拉选项中的 label 与 value 将会是同一个值 ）
  // value?: string | number
}

/* 元素信息 */
export type TElementInfo = {
  // 标签类型
  tagType?: TTagType
  // 字段名
  fieldName: string
  // 元素样式
  style: CSSProperties
  // 行数（textarea 元素专属）
  rows: number
  // 下拉选择项（select、datalist 元素专属）
  options: TOption[]
}

/* 页面信息 */
export type TPageInfo = {
  // 元素样式
  style: CSSProperties
}

/* CSS属性元组 */
// 💥 由于使用 keyof CSSProperties 获取 css 属性键会导致 TS 报错：【表达式生成的联合类型过于复杂，无法表示】。所以这里暂时使用自定义联合类型
export type TCSSPropertyTuple = [
  'width' | 'height' | 'padding' | 'margin',
  CSSProperties[keyof CSSProperties]
]
// export type TCSSPropertyTuple = [keyof CSSProperties, CSSProperties[keyof CSSProperties]]
