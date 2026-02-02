// loader.ts - 递归读取代码文件
// 职责：遍历指定目录，读取所有 .ts 文件内容

import { readFileSync, statSync } from 'fs';
import { glob } from 'glob';
import { relative } from 'path';

export interface LoadedFile {
	filePath: string;   // 相对于 rootDir 的路径
	content: string;    // 文件内容
}

// 默认忽略的目录和文件
const DEFAULT_IGNORE = [
	'**/node_modules/**',
	'**/dist/**',
	'**/*.test.ts',
	'**/*.spec.ts',
	'**/.*/**',
];

/**
 * 加载指定目录下的所有 TypeScript 文件
 * @param rootDir 根目录（绝对路径）
 * @param patterns 额外的 glob 模式，默认 ['**\/*.ts']
 * @param ignore 忽略的模式
 */
export async function loadFiles(
	rootDir: string,
	patterns: string[] = ['**/*.ts'],
	ignore: string[] = DEFAULT_IGNORE
): Promise<LoadedFile[]> {
	const files: LoadedFile[] = [];

	for (const pattern of patterns) {
		const matches = await glob(pattern, {
			cwd: rootDir,
			ignore,
			nodir: true,
			absolute: true,
		});

		for (const absPath of matches) {
			const stat = statSync(absPath);
			// 跳过过大的文件（超过 100KB）
			if (stat.size > 100 * 1024) {
				console.log(`[loader] 跳过大文件: ${absPath} (${stat.size} bytes)`);
				continue;
			}

			const content = readFileSync(absPath, 'utf-8');
			const filePath = relative(rootDir, absPath);

			files.push({ filePath, content });
		}
	}

	console.log(`[loader] 加载了 ${files.length} 个文件`);
	return files;
}
