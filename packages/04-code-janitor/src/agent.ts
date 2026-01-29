import 'dotenv/config';
import OpenAI from 'openai';
import { JanitorState, INITIAL_STATE } from './types';
import { readFile, writeFile, listDir, runCommand, ensureSandbox } from './tools';
import { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ============================================
// 初始化
// ============================================

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================
// 工具定义（暴露给 LLM）
// ============================================

const tools: ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "read_file",
			description: "Read the contents of a file in the sandbox project",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative path from sandbox root, e.g. 'src/utils.ts'" }
				},
				required: ["path"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "write_file",
			description: "Write or overwrite a file in the sandbox project. Provide the COMPLETE file content.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative path from sandbox root" },
					content: { type: "string", description: "The COMPLETE file content to write (not just the new part)" }
				},
				required: ["path", "content"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "list_dir",
			description: "List files and directories in the sandbox project",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative path from sandbox root, default is '.'" }
				},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "run_command",
			description: "Run a shell command in the sandbox project (e.g. 'npm test', 'npm run build')",
			parameters: {
				type: "object",
				properties: {
					cmd: { type: "string", description: "The command to run" }
				},
				required: ["cmd"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "task_complete",
			description: "Call this when the task is successfully completed and all tests pass",
			parameters: {
				type: "object",
				properties: {
					summary: { type: "string", description: "A brief summary of what was done" }
				},
				required: ["summary"]
			}
		}
	}
];

// ============================================
// 存储读取的文件内容
// ============================================

type FileCache = Record<string, string>;

// ============================================
// Agent 核心循环
// ============================================

export async function runJanitor(task: string): Promise<string> {
	ensureSandbox();

	let state: JanitorState = { ...INITIAL_STATE, task };
	const fileCache: FileCache = {};
	const messages: ChatCompletionMessageParam[] = [];

	// 初始系统消息
	messages.push({
		role: "system",
		content: `You are Code Janitor, an expert TypeScript developer.
You are working in a sandbox TypeScript project with Jest for testing.

IMPORTANT RULES:
1. You MUST write code, not just explore. After reading a file, write the updated version immediately.
2. When using write_file, provide the COMPLETE file content, not just the new code.
3. Always add tests for new functionality.
4. Run 'npm test' to verify your changes work.
5. If tests fail, fix the code and run tests again.
6. Call task_complete only after tests pass.

Be decisive and take action. Don't just explore - implement the solution.`
	});

	// 初始用户消息
	messages.push({
		role: "user",
		content: `Task: ${task}

The project structure is:
- src/utils.ts - utility functions
- src/utils.test.ts - tests for utilities

Start by reading the existing code, then implement the requested feature.`
	});

	console.log(`\n🧹 Code Janitor Starting...`);
	console.log(`📋 Task: "${task}"`);
	console.log("-----------------------------------");

	while (state.iteration < state.max_iterations && !state.completed) {
		state.iteration++;
		console.log(`\n🔄 [Step ${state.iteration}/${state.max_iterations}]`);

		// 调用 LLM
		const completion = await client.chat.completions.create({
			model: process.env.OPENAI_MODEL || 'gpt-4o',
			messages: messages,
			tools: tools,
			tool_choice: "required", // 强制调用工具
		});

		const message = completion.choices[0].message;

		// 把 assistant 消息加入历史
		messages.push(message);

		// 处理工具调用
		if (message.tool_calls && message.tool_calls.length > 0) {
			for (const toolCall of message.tool_calls) {
				const funcName = toolCall.function.name;

				// 防御性检查：确保 arguments 存在
				let args: any = {};
				try {
					args = JSON.parse(toolCall.function.arguments || '{}');
				} catch (parseError) {
					console.log(`   ⚠️  Failed to parse arguments, using empty object`);
				}

				let toolResult = "";

				console.log(`🛠️  ${funcName}(${JSON.stringify(args).slice(0, 80)}...)`);

				try {
					if (funcName === 'read_file') {
						const content = readFile(args.path);
						fileCache[args.path] = content;
						state.files_read.push(args.path);
						toolResult = content;
					} else if (funcName === 'write_file') {
						writeFile(args.path, args.content);
						state.files_written.push(args.path);
						fileCache[args.path] = args.content;
						toolResult = `Successfully wrote ${args.content.length} chars to ${args.path}`;
					} else if (funcName === 'list_dir') {
						const entries = listDir(args.path || '.');
						toolResult = entries.join('\n');
					} else if (funcName === 'run_command') {
						const result = runCommand(args.cmd);
						state.command_history.push(result);
						if (!result.success) {
							state.last_error = result.output;
							toolResult = `FAILED:\n${result.output}`;
						} else {
							state.last_error = null;
							toolResult = `SUCCESS:\n${result.output}`;
						}
					} else if (funcName === 'task_complete') {
						state.completed = true;
						console.log(`\n✅ Task Complete!`);
						console.log(`📝 Summary: ${args.summary || 'No summary provided'}`);
						return args.summary || 'Task completed';
					} else {
						toolResult = `Unknown tool: ${funcName}`;
					}
				} catch (e: any) {
					console.log(`   ❌ Error: ${e.message}`);
					state.last_error = e.message;
					toolResult = `ERROR: ${e.message}`;
				}

				// 把工具结果加入消息历史
				messages.push({
					role: "tool",
					tool_call_id: toolCall.id,
					content: toolResult || "No result"
				});
			}
		} else {
			// LLM 没有调用工具，添加一个提示消息
			console.log(`💭 ${message.content?.slice(0, 100) || '(no content)'}...`);
			// 强制下一轮调用工具
			messages.push({
				role: "user",
				content: "Please call a tool to make progress on the task. If you need to see the code, use read_file. If you're ready to add code, use write_file."
			});
		}
	}

	if (!state.completed) {
		console.warn("\n🛑 Max iterations reached without completion.");
		return "Task incomplete - max iterations reached";
	}

	return "Task completed";
}

// ============================================
// 导出
// ============================================

export { JanitorState };
