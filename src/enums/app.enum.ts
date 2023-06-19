import type { TTagType } from '@/types/app.type'

// 标签元素类型枚举
export enum ETagType {
  INPUT = '单行输入框',
  TEXTAREA = '多行输入框',
  SELECT = '下拉选择框',
  INPUT_DATALIST = '单行输入框（可下拉选择）'
}

// 元素类型下拉选项
export const tagTypeList = (Object.keys(ETagType) as TTagType[]).map((key) => ({
  label: ETagType[key],
  value: key
}))
