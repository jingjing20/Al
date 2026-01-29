import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CommandResult } from './types';

// ============================================
// Sandbox 配置
// ============================================

// Agent 只能操作这个目录下的文件
const SANDBOX_ROOT = path.join(__dirname, '../sandbox');

// 允许执行的命令白名单（前缀匹配）
const ALLOWED_COMMANDS = [
	'npm test',
	'npm run',
	'npx tsc',
	'cat ',
	'ls ',
	'echo ',
];

/**
 * 验证路径是否在 Sandbox 内
 */
function validatePath(targetPath: string): string {
	const resolved = path.resolve(SANDBOX_ROOT, targetPath);
	if (!resolved.startsWith(SANDBOX_ROOT)) {
		throw new Error(`Security Error: Path "${targetPath}" is outside sandbox`);
	}
	return resolved;
}

/**
 * 验证命令是否在白名单内
 */
function validateCommand(cmd: string): void {
	const isAllowed = ALLOWED_COMMANDS.some(prefix => cmd.startsWith(prefix));
	if (!isAllowed) {
		throw new Error(`Security Error: Command "${cmd}" is not in whitelist`);
	}
}

// ============================================
// Tool 1: 读取文件
// ============================================

export function readFile(relativePath: string): string {
	const fullPath = validatePath(relativePath);

	if (!fs.existsSync(fullPath)) {
		throw new Error(`File not found: ${relativePath}`);
	}

	const content = fs.readFileSync(fullPath, 'utf-8');
	console.log(`📖 [read_file] ${relativePath} (${content.length} chars)`);

	// 如果文件太大，截断以节省 Token
	if (content.length > 5000) {
		console.log(`   ⚠️  Truncated to 5000 chars`);
		return content.slice(0, 5000) + '\n... (truncated)';
	}

	return content;
}

// ============================================
// Tool 2: 写入文件
// ============================================

export function writeFile(relativePath: string, content: string): void {
	const fullPath = validatePath(relativePath);

	// 确保目录存在
	const dir = path.dirname(fullPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.writeFileSync(fullPath, content, 'utf-8');
	console.log(`✏️  [write_file] ${relativePath} (${content.length} chars)`);
}

// ============================================
// Tool 3: 列出目录
// ============================================

export function listDir(relativePath: string = '.'): string[] {
	const fullPath = validatePath(relativePath);

	if (!fs.existsSync(fullPath)) {
		throw new Error(`Directory not found: ${relativePath}`);
	}

	const entries = fs.readdirSync(fullPath, { withFileTypes: true });
	const result = entries.map(e => {
		const prefix = e.isDirectory() ? '[DIR]' : '[FILE]';
		return `${prefix} ${e.name}`;
	});

	console.log(`📂 [list_dir] ${relativePath} (${result.length} items)`);
	return result;
}

// ============================================
// Tool 4: 执行命令
// ============================================

export function runCommand(cmd: string): CommandResult {
	validateCommand(cmd);

	console.log(`🔧 [run_command] ${cmd}`);

	try {
		const output = execSync(cmd, {
			cwd: SANDBOX_ROOT,
			encoding: 'utf-8',
			timeout: 30000, // 30 秒超时
			stdio: ['pipe', 'pipe', 'pipe']
		});

		console.log(`   ✅ Success`);
		return { cmd, output: output.slice(0, 2000), success: true };
	} catch (e: any) {
		const errorOutput = e.stderr || e.stdout || e.message;
		console.log(`   ❌ Failed`);
		return { cmd, output: errorOutput.slice(0, 2000), success: false };
	}
}

// ============================================
// 辅助函数：确保 Sandbox 存在
// ============================================

export function ensureSandbox(): void {
	if (!fs.existsSync(SANDBOX_ROOT)) {
		fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
		console.log(`📦 Created sandbox at ${SANDBOX_ROOT}`);
	}
}

export { SANDBOX_ROOT };
