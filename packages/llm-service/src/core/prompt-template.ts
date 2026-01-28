import type { Message } from './types.js'

export interface PromptTemplateConfig {
	/** System prompt 模板 */
	system?: string
	/** User prompt 模板 */
	user: string
}

/**
 * Prompt 模板
 * 支持 {{variable}} 语法的变量替换
 */
export class PromptTemplate {
	private systemTemplate?: string
	private userTemplate: string

	constructor(config: PromptTemplateConfig) {
		this.systemTemplate = config.system
		this.userTemplate = config.user
	}

	/**
	 * 渲染模板为 Messages 数组
	 */
	render(variables: Record<string, string>): Message[] {
		const messages: Message[] = []

		if (this.systemTemplate) {
			messages.push({
				role: 'system',
				content: this.interpolate(this.systemTemplate, variables),
			})
		}

		messages.push({
			role: 'user',
			content: this.interpolate(this.userTemplate, variables),
		})

		return messages
	}

	/**
	 * 变量替换: {{key}} -> value
	 */
	private interpolate(template: string, variables: Record<string, string>): string {
		return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			if (!(key in variables)) {
				throw new Error(`Missing template variable: ${key}`)
			}
			return variables[key]
		})
	}

	/**
	 * 获取模板中的变量名列表
	 */
	getVariables(): string[] {
		const combined = (this.systemTemplate ?? '') + this.userTemplate
		const matches = combined.matchAll(/\{\{(\w+)\}\}/g)
		return [...new Set([...matches].map(m => m[1]))]
	}
}
