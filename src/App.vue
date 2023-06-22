<script setup lang="ts">
import {
  ref,
  reactive,
  watchEffect,
  watch,
  nextTick,
  getCurrentInstance,
  type CSSProperties
} from 'vue'
import { getTemplateStrAPI } from '@/apis'
import { tagTypeList } from '@/enums/app.enum'
import type {
  TInputType,
  TOption,
  TElementInfo,
  TTagType,
  TPageInfo,
  TCSSPropertyTuple
} from '@/types/app.type'

// 获取全局挂载的方法
const { $createId } = getCurrentInstance()!.proxy!
// 模板容器引用
const templateRef = ref<HTMLDivElement>()
// 模板 html 字符串
const templateHtmlStr = ref('')
// 表单元素列表
const formElementList = ref<NodeListOf<HTMLElement>>()
// 默认下拉选择项
const defaultOptions: TOption[] = [
  {
    id: '-1',
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
  inputType: 'text',
  style: {
    width: ''
  },
  rows: 6,
  options: defaultOptions
})
// 当前操作元素
const currentElement = ref<HTMLElement>()

// 元素信息设置为默认值
function setDefaultElementInfo() {
  elementInfo.tagType = undefined
  elementInfo.fieldName = ''
  elementInfo.style = {}
  elementInfo.rows = 6
  elementInfo.options = defaultOptions
}

// 页面信息
const pageInfo = reactive<TPageInfo>({
  style: {}
})

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
  elementInfo.style = {
    width: targetElement.style.width,
    height: targetElement.style.height,
    padding: targetElement.style.padding,
    margin: targetElement.style.margin
  }
  if (elementInfo.tagType === 'INPUT') {
    elementInfo.inputType = (targetElement as HTMLInputElement).type as TInputType
  } else if (elementInfo.tagType === 'TEXTAREA') {
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
    // 定义通过 matchAttribute 查找对应 <matchTag> 元素中的所有 <option> 元素的 value 属性值的正则表达式。说明：?<=正向后行断言、\s空白符类、[^ ]取反字符集、?!负向先行断言共同匹配 value 属性值之前的内容；*?非贪婪匹配 value 属性值；?=正向先行断言匹配 value 属性值之后的内容。
    const optionValueRegExp = new RegExp(
      `(?<=<${matchTag}\\s+[^>]*${matchAttribute}="${matchAttributeValue}"[^>]*>(.(?!data-column))+value=").*?(?="[^>]*>.+</${matchTag}>)`,
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
  // 获取所有的表单元素
  formElementList.value = templateRef.value?.querySelectorAll('input,textarea,select')
  formElementList.value?.forEach((formElement) => {
    // 将表单元素字体大小设置为同页面字体大小一致
    formElement.style.fontSize = pageInfo.style['font-size'] as string
    formElement.addEventListener('focus', onFocus)
    if (formElement.dataset.column === elementInfo.fieldName) {
      // 由于元素信息发生改变后页面重新渲染，内存地址发生改变，需要根据字段名找到当前操作元素并重新设置
      currentElement.value = formElement
      // 由于元素信息发生改变后页面重新渲染，导致原本获得焦点的元素会失焦样式高亮丢失，所需需要重新找到该元素并使其高亮。注：此处不能让元素元素重新聚焦，聚焦会使右侧操作栏每次修改元素信息时都会使元素元素聚焦，导致修改一次后想再次修改必须重新点击操作栏
      formElement.style.outline = 'dashed var(--el-color-primary)'
    }
  })
}

// 移除监听表单元素
function removeListenElement() {
  formElementList.value?.forEach((formElement) => {
    formElement.removeEventListener('focus', onFocus)
  })
}

// 初始化模板 html 字符串
function initTemplateHtmlStr(templateHtmlStr: string) {
  // 去除所有图片 && 初始化页面样式。行高: 1.8; 字号: 18px
  templateHtmlStr = templateHtmlStr
    .replace(/<img[^>]*>/g, '')
    .replace(/<div[^>]*>/, `<div style="line-height: 1.8;font-size: 18px">`)
  return templateHtmlStr
}

// 获取模板 html 字符串
async function getTemplateStr() {
  const res = await getTemplateStrAPI()
  templateHtmlStr.value = initTemplateHtmlStr(res)
  await nextTick()
  setPageInfo()
}

getTemplateStr()

/**
 * 切换样式对象形式与字符串形式。若传入对象形式，则转换为字符串形式；若传入字符串形式，则转换为对象形式
 *
 * @param originStyle 原样式
 * @return targetStyle 目标样式
 */
function toggleStyleObjectWithStr<
  T extends string | CSSProperties | undefined,
  R = T extends string ? CSSProperties : T extends CSSProperties ? string : undefined
>(originStyle: T): R {
  let targetStyle: R
  if (typeof originStyle === 'object') {
    // 若传入对象形式，则转换为字符串形式
    targetStyle = Object.entries(originStyle)
      .map(([key, value]) => `${key}:${value}`)
      .join(';') as R
  } else if (typeof originStyle === 'string') {
    // 若传入字符串形式，则转换为对象形式
    targetStyle = originStyle.split(';').reduce((result: CSSProperties, prop) => {
      // 获取 css 样式属性的键与值
      const [key, value] = prop
        .split(':')
        .map((item) => item.trim()) as unknown as TCSSPropertyTuple
      if (key && value) {
        result[key] = value
      }
      return result
    }, {}) as R
  } else {
    targetStyle = undefined as R
  }

  return targetStyle
}

// 元素信息改变时，处理模板 html
watchEffect(() => {
  const { tagType, fieldName, inputType, style, rows, options } = elementInfo
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
    const oldElementStyleObj = toggleStyleObjectWithStr(oldElementStyleStr)

    // 合并生成新元素样式对象
    const newElementStyleObj = Object.assign(oldElementStyleObj, style)
    // 新元素样式对象转字符串形式
    let newElementStyleStr = toggleStyleObjectWithStr(newElementStyleObj)

    // 新元素 html 字符串
    let newElementHTMLStr = ''
    // 生成 <option> 元素字符串
    const optionElementHTMLStr = options
      .map(
        (option, index) =>
          `<option ${index === 0 ? 'selected disabled' : ''}  value="${option.label}">${
            index === 0 ? '--请选择--' : option.label
          }</option>`
      )
      .join('')
    switch (tagType) {
      case 'INPUT':
        newElementHTMLStr = `<input data-column="${fieldName}" type="${inputType}" style="${newElementStyleStr}" />`
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
})

// 设置页面初始信息。立即执行，只在 created 阶段执行一次
function setPageInfo() {
  // 页面样式字符串
  const pageStyleStr = templateRef.value?.lastElementChild?.attributes[0]?.value || ''
  // 页面样式字符串转对象形式
  const pageStyleObj = toggleStyleObjectWithStr(pageStyleStr)
  // 若存在行高，则将行高字符串转为数字形式
  pageStyleObj['line-height'] && (pageStyleObj['line-height'] = Number(pageStyleObj['line-height']))
  pageInfo.style = pageStyleObj
}

// 页面信息改变时，处理模板 html
watch(
  () => pageInfo.style,
  (newPageStyleObj) => {
    // 新页面样式对象转字符串形式
    const newPageStyleStr = toggleStyleObjectWithStr(newPageStyleObj)
    if (newPageStyleStr) {
      // 如果新页面样式字符串不为空，则替换为新的样式
      templateHtmlStr.value = templateHtmlStr.value.replace(
        /<div[^>]*>/,
        `<div style="${newPageStyleStr}">`
      )
    }
  },
  {
    deep: true
  }
)

watch(
  () => templateHtmlStr.value,
  () => {
    // 每当模板 html 字符串发生变化时，先移除旧表单元素的所有 focus 事件监听器，再重新对新表单元素进行监听，以避免内存泄漏和性能问题
    removeListenElement()
    listenElement()
  }
)

// 取消当前选中的元素
function handleCancelSelected() {
  // 取消当前选中元素的样式高亮
  currentElement.value && (currentElement.value.style.outline = 'unset')
  // 元素信息设置为默认值
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
        <el-tabs stretch>
          <el-tab-pane label="元素信息">
            <el-form :model="elementInfo" label-width="98px" :disabled="!elementInfo.tagType">
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
              <el-form-item prop="inputType" v-show="elementInfo.tagType === 'INPUT'">
                <template #label>
                  输入类型
                  <el-tooltip effect="dark" placement="top-end">
                    <template #content>
                      <p>解释：单行输入框允许输入的内容类型。</p>
                      <p>①字符类型：允许输入任意字符串类型内容；</p>
                      <p>②数字类型：仅允许输入数字类型内容。</p>
                    </template>
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-switch
                  v-model="elementInfo.inputType"
                  active-text="数字类型"
                  inactive-text="字符类型"
                  active-value="number"
                  inactive-value="text"
                />
              </el-form-item>
              <el-form-item label="元素宽度" prop="width">
                <el-input v-model="elementInfo.style.width" />
              </el-form-item>
              <el-form-item label="元素高度" prop="height">
                <el-input v-model="elementInfo.style.height" />
              </el-form-item>
              <el-form-item prop="padding">
                <template #label>
                  元素内边距
                  <el-tooltip effect="dark" placement="top-end">
                    <template #content>
                      <p>解释：元素边框与其实际内容之间留出的空白区域。</p>
                      <p>举例：</p>
                      <p>① 10px：上下左右留出的空白区域都是 10px；</p>
                      <p>② 10px 5px：上下留出 10px 、左右留出 5px；</p>
                      <p>③ 15px 10px 5px：上留出 15px、左右留出 10px、下留出 5px；</p>
                      <p>
                        ④ 20px 15px 10px 5px：上留出 20px、右留出 15px、下留出 10px、左留出 5px。
                      </p>
                    </template>
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-input v-model="elementInfo.style.padding" />
              </el-form-item>
              <el-form-item label="元素外边距" prop="margin">
                <template #label>
                  元素外边距
                  <el-tooltip effect="dark" placement="top-end">
                    <template #content>
                      <p>解释：元素边框与相邻元素之间留出的空白区域。</p>
                      <p>举例：</p>
                      <p>① 10px：上下左右留出的空白区域都是 10px；</p>
                      <p>② 10px 5px：上下留出 10px 、左右留出 5px；</p>
                      <p>③ 15px 10px 5px：上留出 15px、左右留出 10px、下留出 5px；</p>
                      <p>
                        ④ 20px 15px 10px 5px：上留出 20px、右留出 15px、下留出 10px、左留出 5px。
                      </p>
                    </template>
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-input v-model="elementInfo.style.margin" />
              </el-form-item>
              <el-form-item label="行数" prop="rows" v-show="elementInfo.tagType === 'TEXTAREA'">
                <el-input-number v-model="elementInfo.rows" />
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
          </el-tab-pane>
          <el-tab-pane label="页面信息">
            <el-form :model="pageInfo" label-width="98px">
              <el-form-item label="行高" prop="line-height">
                <el-input-number
                  controls-position="right"
                  v-model="pageInfo.style['line-height']"
                  :min="1"
                  :step="0.1"
                />
              </el-form-item>
              <el-form-item label="字号" prop="font-size">
                <el-input v-model="pageInfo.style['font-size']"> </el-input>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </el-aside>
    </el-container>
  </div>
</template>

<style scoped>
.right-board {
  width: 350px;
  padding: 10px;
  border: 1px solid #ccc;
}

.right-board .title {
  text-align: center;
}

:deep(.el-form-item) .el-form-item__label {
  align-items: center !important;
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
