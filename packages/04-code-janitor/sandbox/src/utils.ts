/**
 * 工具函数集合
 * Code Janitor 将会在这里添加新函数
 */

/**
 * 将字符串首字母大写
 */
export function capitalize(str: string): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 反转字符串
 */
export function reverse(str: string): string {
	return str.split('').reverse().join('');
}

/**
 * 将字符串转换为URL友好的slug
 * 规则：
 * 1. 转换为小写
 * 2. 将非字母数字字符替换为连字符
 * 3. 移除开头和结尾的连字符
 * 4. 合并多个连续连字符为单个
 */
export function slugify(str: string): string {
	if (!str) return '';
	
	return str
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '') // 移除非字母数字字符（空格和连字符保留）
		.replace(/\s+/g, '-')          // 将空格替换为连字符
		.replace(/-+/g, '-')           // 合并多个连字符
		.replace(/^-|-$/g, '');        // 移除开头和结尾的连字符
}
