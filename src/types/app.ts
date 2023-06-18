import { ETagType } from '@/enums/app'
import type { CSSProperties } from 'vue'

/* 标签类型。说明：typeof ETagType 将枚举转成 type 类型；keyof 获取 type 类型中所有 key 组成联合类型 */
export type TTagType = keyof typeof ETagType

/* 下拉选择项 */
export type TOption = {
  // 选择项主键
  id: string
  // 选择项文本
  label: string
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

/* CSS属性元组 */
// export type TCSSPropertyTuple = [keyof CSSProperties, CSSProperties[keyof CSSProperties]]
export type TCSSPropertyTuple = [keyof CSSProperties, CSSProperties[keyof CSSProperties]]
