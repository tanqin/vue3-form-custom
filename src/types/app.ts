import { ETagType } from '@/enums/app'

// 标签类型 type。说明：typeof ETagType 将枚举转成 type 类型；keyof 获取 type 类型中所有 key 组成联合类型
export type TTagType = keyof typeof ETagType

// 下拉选择项 type
export type TOption = {
  id: string
  label: string
}

// 元素信息 type
export type TElementInfo = {
  tagType?: TTagType
  fieldName: string
  elementWidth: string
  rows: number
  options: TOption[]
}

// 样式对象 type
export type TElementStyleObject = {
  [key: string]: string
}
