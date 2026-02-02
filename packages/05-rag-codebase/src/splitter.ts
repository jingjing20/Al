// splitter.ts - 代码切分器
// 职责：将代码文件切分成有意义的 chunks（按函数/类边界）
// 策略：使用正则匹配函数和类定义，保持代码语义完整性

import type { CodeChunk } from './types.js';
import type { LoadedFile } from './loader.js';
import { createHash } from 'crypto';

// 最大 chunk 大小（字符数），超过会被进一步切分
const MAX_CHUNK_SIZE = 2000;
// 最小 chunk 大小，太小的块会被合并
const MIN_CHUNK_SIZE = 100;

/**
 * 生成 chunk ID
 */
function generateId(filePath: string, startLine: number): string {
	const hash = createHash('md5')
		.update(`${filePath}:${startLine}`)
		.digest('hex')
		.slice(0, 8);
	return hash;
}

/**
 * 切分单个文件为 chunks
 * 尝试按函数/类边界切分，如果失败则按固定行数切分
 */
function splitFile(file: LoadedFile): CodeChunk[] {
	const chunks: CodeChunk[] = [];
	const lines = file.content.split('\n');

	// 正则：匹配函数定义（export function, async function, const xxx = 等）
	const functionPattern = /^(export\s+)?(async\s+)?function\s+(\w+)/;
	const arrowFunctionPattern = /^(export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s*)?\(/;
	const classPattern = /^(export\s+)?(abstract\s+)?class\s+(\w+)/;

	// 标记代码块的起始位置
	interface BlockMarker {
		startLine: number;
		type: 'function' | 'class' | 'other';
		name?: string;
	}

	const markers: BlockMarker[] = [];

	// 扫描所有函数/类定义的位置
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		let match = trimmed.match(functionPattern);
		if (match) {
			markers.push({ startLine: i, type: 'function', name: match[3] });
			continue;
		}

		match = trimmed.match(arrowFunctionPattern);
		if (match) {
			markers.push({ startLine: i, type: 'function', name: match[3] });
			continue;
		}

		match = trimmed.match(classPattern);
		if (match) {
			markers.push({ startLine: i, type: 'class', name: match[3] });
			continue;
		}
	}

	// 如果没找到任何标记，整个文件作为一个 chunk
	if (markers.length === 0) {
		const content = file.content.trim();
		if (content.length >= MIN_CHUNK_SIZE) {
			chunks.push({
				id: generateId(file.filePath, 0),
				filePath: file.filePath,
				content,
				startLine: 1,
				endLine: lines.length,
				type: 'other',
			});
		}
		return chunks;
	}

	// 处理文件开头到第一个标记之间的内容（通常是 import 语句）
	if (markers[0].startLine > 0) {
		const headerContent = lines.slice(0, markers[0].startLine).join('\n').trim();
		if (headerContent.length >= MIN_CHUNK_SIZE) {
			chunks.push({
				id: generateId(file.filePath, 0),
				filePath: file.filePath,
				content: headerContent,
				startLine: 1,
				endLine: markers[0].startLine,
				type: 'other',
			});
		}
	}

	// 按标记切分
	for (let i = 0; i < markers.length; i++) {
		const current = markers[i];
		const nextStart = markers[i + 1]?.startLine ?? lines.length;

		const content = lines.slice(current.startLine, nextStart).join('\n').trim();

		// 跳过太小的块
		if (content.length < MIN_CHUNK_SIZE) {
			continue;
		}

		// 如果块太大，进一步切分
		if (content.length > MAX_CHUNK_SIZE) {
			const subChunks = splitLargeBlock(
				file.filePath,
				content,
				current.startLine,
				current.type,
				current.name
			);
			chunks.push(...subChunks);
		} else {
			chunks.push({
				id: generateId(file.filePath, current.startLine),
				filePath: file.filePath,
				content,
				startLine: current.startLine + 1,
				endLine: nextStart,
				type: current.type,
				name: current.name,
			});
		}
	}

	return chunks;
}

/**
 * 切分过大的代码块
 * 按固定行数切分，保持上下文重叠
 */
function splitLargeBlock(
	filePath: string,
	content: string,
	baseStartLine: number,
	type: 'function' | 'class' | 'other',
	name?: string
): CodeChunk[] {
	const chunks: CodeChunk[] = [];
	const lines = content.split('\n');
	const chunkSize = 50;  // 每个子块最多 50 行
	const overlap = 5;     // 重叠 5 行保持上下文

	for (let i = 0; i < lines.length; i += chunkSize - overlap) {
		const endIdx = Math.min(i + chunkSize, lines.length);
		const chunkContent = lines.slice(i, endIdx).join('\n').trim();

		if (chunkContent.length >= MIN_CHUNK_SIZE) {
			chunks.push({
				id: generateId(filePath, baseStartLine + i),
				filePath,
				content: chunkContent,
				startLine: baseStartLine + i + 1,
				endLine: baseStartLine + endIdx,
				type,
				name: name ? `${name} (part ${Math.floor(i / (chunkSize - overlap)) + 1})` : undefined,
			});
		}
	}

	return chunks;
}

/**
 * 切分多个文件
 */
export function splitFiles(files: LoadedFile[]): CodeChunk[] {
	const allChunks: CodeChunk[] = [];

	for (const file of files) {
		const chunks = splitFile(file);
		allChunks.push(...chunks);
	}

	console.log(`[splitter] 切分出 ${allChunks.length} 个 chunks`);
	return allChunks;
}
