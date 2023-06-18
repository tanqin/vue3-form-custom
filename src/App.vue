<script setup lang="ts">
import { ref, reactive, watchEffect, nextTick, getCurrentInstance } from 'vue'
import { Operation, Remove } from '@element-plus/icons-vue'
import { getTemplateStrAPI } from '@/apis'
import { ETagType } from '@/enums/app'
import type { TElementInfo, TElementStyleObject, TTagType } from '@/types/app'

// 获取全局挂载的方法
const { $createId } = getCurrentInstance()!.proxy!
// 元素类型下拉选项
const tagTypeList = (Object.keys(ETagType) as TTagType[]).map((key) => ({
  // key as keyof typeof ETagType 将 key 断言为 ETagType 的键的类型。
  label: ETagType[key],
  value: key
}))
// 模板容器引用
const templateRef = ref<HTMLDivElement>()
// 模板 html 字符串
const templateHtmlStr = ref('')
// 表单元素列表
const formElementList = ref<NodeListOf<Element>>()
// 默认下拉选择项
const defaultOptions = [
  {
    id: $createId(),
    label: ''
  },
  {
    id: $createId(),
    label: '选项一'
  },
  {
    id: $createId(),
    label: '选项二'
  }
]
// 元素信息
const elementInfo = reactive<TElementInfo>({
  tagType: undefined,
  fieldName: '',
  elementWidth: '',
  rows: 6,
  options: defaultOptions
})
// 当前操作元素
const currentElement = ref<HTMLElement>()

// 元素信息设置为默认值
function setDefaultElementInfo() {
  elementInfo.tagType = undefined
  elementInfo.fieldName = ''
  elementInfo.elementWidth = ''
  elementInfo.rows = 6
  elementInfo.options = defaultOptions
}

// 获取焦点事件监听函数
function onFocus(e: FocusEvent) {
  const targetElement = e.target as HTMLElement
  // 去除上一个聚焦元素的样式高亮
  currentElement.value && (currentElement.value.style.outline = 'unset')
  // 重新设置新的当前元素
  currentElement.value = targetElement

  // 元素信息设置为默认值，避免留存上一个元素的信息
  setDefaultElementInfo()

  // 样式高亮
  targetElement.style.outline = 'dashed var(--el-color-primary)'

  // 获取元素标签名
  let tagName = targetElement.tagName as TTagType
  // 查询下一个兄弟元素标签名
  const nextTagName = targetElement.nextElementSibling?.tagName
  if (nextTagName === 'DATALIST') {
    tagName = (tagName + '_' + nextTagName) as TTagType
  }

  // 设置元素信息
  elementInfo.tagType = tagName
  elementInfo.fieldName = targetElement.dataset.column!
  elementInfo.elementWidth = targetElement.style.width
  if (elementInfo.tagType === 'TEXTAREA') {
    elementInfo.rows = Number(targetElement.getAttribute('rows') || 6)
  } else if (['SELECT', 'INPUT_DATALIST'].includes(elementInfo.tagType)) {
    // 要匹配的标签
    let matchTag = null
    // 要匹配的属性
    let matchAttribute = null
    // 要匹配的属性值
    let matchAttributeValue = null
    switch (elementInfo.tagType) {
      case 'SELECT':
        matchTag = 'select'
        matchAttribute = 'data-column'
        matchAttributeValue = elementInfo.fieldName
        break
      case 'INPUT_DATALIST':
        matchTag = 'datalist'
        matchAttribute = 'id'
        // 通过元素 list 属性获取到它所绑定的 <datalist> 元素的 id
        matchAttributeValue = targetElement.getAttribute('list')
        break
    }
    // 定义通过 matchAttribute 查找对应 <matchTag> 元素中的所有 <option> 元素的 value 属性值的正则表达式。说明：正向后行断言、\s空白符类、[^ ]取反字符集、?!负向先行断言共同匹配 value 属性值之前的内容；*?非贪婪匹配 value 属性值；正向先行断言匹配 value 属性值之后的内容。
    const optionValueRegExp = new RegExp(
      `(?<=<${matchTag}\\s+[^>]*${matchAttribute}="${matchAttributeValue}"[^>]*>(.(?!data-column))+value=").*?(?=">.+</${matchTag}>)`,
      'gm'
    )
    // 匹配所有 <option> 元素的 value 属性值
    const optionValueMatch = templateHtmlStr.value.match(optionValueRegExp) || []
    // 设置下拉选择项
    elementInfo.options = optionValueMatch.map((item) => ({
      id: $createId(),
      label: item
    }))
  }
}

// 监听表单元素
async function listenElement() {
  await nextTick()
  // 获取所有的表单元素元素
  formElementList.value = templateRef.value?.querySelectorAll('input,textarea,select')
  formElementList.value?.forEach((formElement) => {
    const element = formElement as HTMLElement
    element.addEventListener('focus', onFocus)
    if (element.dataset.column === elementInfo.fieldName) {
      // 由于元素信息发生改变后页面重新渲染，内存地址发生改变，需要根据字段名找到当前操作元素并重新设置
      currentElement.value = element
      // 由于元素信息发生改变后页面重新渲染，导致原本获得焦点的元素会失焦样式高亮丢失，所需需要重新找到该元素并使其高亮。注：此处不能让元素元素重新聚焦，聚焦会使右侧操作栏每次修改元素信息时都会使元素元素聚焦，导致修改一次后想再次修改必须重新点击操作栏
      element.style.outline = 'dashed var(--el-color-primary)'
    }
  })
}

// 获取模板 html 字符串
async function getTemplateStr() {
  const res = await getTemplateStrAPI()
  templateHtmlStr.value = res
  listenElement()
}

getTemplateStr()

watchEffect(() => {
  const { tagType, fieldName, elementWidth, rows, options } = elementInfo
  if (!tagType) return
  // 定义查找表单元素（input、textarea、select）的正则表达式。说明：(input|textarea|select)分组捕获、\s空白符类、[^ ]取反字符集 共同匹配表单元素开始标签；*? 非贪婪匹配、\1第一个捕获组 共同匹配表单内容和结束标签；\s空白符类、[^ ]取反字符集共同匹配 datalist 标签（当元素类型为【单行输入框（可下拉选择）】时生效）。
  const elementRegExp = new RegExp(
    `<(input|textarea|select)\\s+[^>]*data-column="${fieldName}"[^>]*>(.*?</\\1>)?(<datalist\\s+[^>]*>.*?</datalist>)?`,
    'gm'
  )
  // 元素信息改变，变更模板的 html 字符串
  templateHtmlStr.value = templateHtmlStr.value.replace(elementRegExp, (str) => {
    // 使用正向后行断言和正向先行断言匹配元素中的行内样式
    const elementStyleMatch = str.match(/(?<=style=")[^"]*(?=")/i)
    // 匹配旧元素样式字符串
    const oldElementStyleStr = elementStyleMatch?.[0] || ''
    // 旧元素样式字符串转对象形式
    const oldElementStyleObj = oldElementStyleStr
      .split(';')
      .reduce((result: TElementStyleObject, prop) => {
        const [key, value] = prop.split(':').map((item) => item.trim())
        if (key && value) {
          result[key] = value
        }
        return result
      }, {})

    // 合并生成新元素样式对象
    const newElementStyleObj = Object.assign(oldElementStyleObj, { width: elementWidth })
    // 新元素样式对象转字符串形式
    let newElementStyleStr = Object.entries(newElementStyleObj)
      .map(([key, value]) => `${key}:${value}`)
      .join(';')

    // 新元素 html 字符串
    let newElementHTMLStr = ''
    // 生成 <option> 元素字符串
    const optionElementHTMLStr = options
      .map((option) => `<option value="${option.label}">${option.label}</option>`)
      .join('')
    switch (tagType) {
      case 'INPUT':
        newElementHTMLStr = `<input data-column="${fieldName}" style="${newElementStyleStr}" />`
        break
      case 'TEXTAREA':
        newElementStyleStr = newElementStyleStr.includes('resize:none')
          ? newElementStyleStr
          : newElementStyleStr + ';resize:none'
        newElementHTMLStr = `<textarea data-column="${fieldName}" style="${newElementStyleStr}" rows="${rows}" ></textarea>`
        break
      case 'SELECT':
        newElementHTMLStr = `<select data-column="${fieldName}" style="${newElementStyleStr}" >${optionElementHTMLStr}</select>`
        break
      case 'INPUT_DATALIST':
        newElementHTMLStr = `<input data-column="${fieldName}" style="${newElementStyleStr}" list="${fieldName}-list" /><datalist id="${fieldName}-list" >${optionElementHTMLStr}</datalist>`
        break
    }

    return newElementHTMLStr
  })
  listenElement()
})

// 取消当前选中的元素
function handleCancelSelected() {
  currentElement.value && (currentElement.value.style.outline = 'unset')
  // 元素信息设置为默认值，避免留存上一个元素的信息
  setDefaultElementInfo()
}

// 添加选择项
function handleAddOption() {
  elementInfo.options.push({
    id: $createId(),
    label: ''
  })
}

// 移除选择项
function handleRemove(id: string) {
  elementInfo.options = elementInfo.options.filter((option) => option.id !== id)
}
</script>

<template>
  <div class="app">
    <el-container>
      <el-main>
        <div ref="templateRef" v-html="templateHtmlStr"></div>
      </el-main>
      <el-aside class="right-board">
        <h2 class="title">元素属性</h2>
        <el-form :model="elementInfo" label-width="80px" :disabled="!elementInfo.tagType">
          <el-form-item label="取消选中">
            <el-button
              :type="elementInfo.tagType ? 'primary' : 'info'"
              @click="handleCancelSelected"
              >取消当前选中元素</el-button
            >
          </el-form-item>
          <el-form-item label="元素类型" prop="tagType">
            <el-select v-model="elementInfo.tagType" placeholder="元素类型">
              <el-option
                v-for="item in tagTypeList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="字段名" prop="fieldName">
            <el-input v-model="elementInfo.fieldName" disabled />
          </el-form-item>
          <el-form-item label="元素宽度" prop="elementWidth">
            <el-input v-model="elementInfo.elementWidth" />
          </el-form-item>
          <el-form-item label="行数" prop="rows" v-show="elementInfo.tagType === 'TEXTAREA'">
            <el-input-number v-model="elementInfo.rows" :min="1" />
          </el-form-item>
          <el-form-item
            prop="options"
            label-width="0"
            v-show="['SELECT', 'INPUT_DATALIST'].includes(elementInfo.tagType!)"
          >
            <el-divider content-position="left">下拉选择项（拖拽自动排序）</el-divider>
            <Draggable
              class="draggable"
              ghost-class="ghost-class"
              chosen-class="chosen-class"
              itemKey="id"
              animation="300"
              handle=".operation-icon"
              :list="elementInfo.options"
            >
              <template #item="{ element, index }">
                <el-row :gutter="10" class="option-item" align="bottom" v-show="index !== 0">
                  <el-col :span="2"
                    ><el-icon class="operation-icon" color="var(--el-color-info)"
                      ><Operation /></el-icon
                  ></el-col>
                  <el-col :span="20"><el-input v-model="element.label"> </el-input></el-col>
                  <el-col :span="2">
                    <el-icon
                      class="remove-icon"
                      color="var(--el-color-danger)"
                      @click="handleRemove(element.id)"
                      ><Remove
                    /></el-icon>
                  </el-col>
                </el-row>
              </template>
            </Draggable>
            <el-link type="primary" icon="CirclePlus" @click="handleAddOption"
              >&ensp;添加选择项</el-link
            >
            <el-divider />
          </el-form-item>
        </el-form>
      </el-aside>
    </el-container>
  </div>
</template>

<style scoped>
.right-board {
  width: 310px;
  padding: 10px;
  border: 1px solid #ccc;
}
.right-board .title {
  text-align: center;
}
.draggable {
  width: 100%;
}

/* 拖动元素的占位符样式 */
.ghost-class {
  border: 1px solid var(--el-color-primary);
}
/* 被选中的目标元素样式 */
.chosen-class {
  background-color: #f1f1f1;
}

.option-item {
  font-size: 20px;
}

.option-item + .option-item {
  margin-top: 10px;
}

.operation-icon:hover {
  cursor: move;
}

.remove-icon:hover {
  cursor: pointer;
}
</style>
