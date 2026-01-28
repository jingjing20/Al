import 'dotenv/config';
import OpenAI from 'openai';
import { z, ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs/promises';
import * as path from 'path';

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// Implementation 1: Manual Zod to String Converter (Good for simple prompts)
function manualZodToPrompt(schema: ZodSchema<any>): string {
	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const descriptionLines = Object.keys(shape).map(key => {
			const field = shape[key];
			let desc = field.description || '';
			// 简单的类型推断
			let typeName = 'Unknown';
			if (field instanceof z.ZodString) typeName = 'String';
			if (field instanceof z.ZodNumber) typeName = 'Number';
			if (field instanceof z.ZodBoolean) typeName = 'Boolean';
			if (field instanceof z.ZodArray) typeName = 'Array';

			return `- ${key} (${typeName}): ${desc}`;
		});
		return descriptionLines.join('\n');
	}
	return "Unknown Schema";
}

// ✅ Pro Implementation: The Generic Extractor
async function extractData<T>(
	content: string,
	schema: ZodSchema<T>,
	useAutoConverter: boolean = true
): Promise<T> {

	// 策略选择：手写转换 vs 库转换
	let schemaDesc = "";
	if (useAutoConverter) {
		// 使用 zod-to-json-schema (Production Ready)
		const jsonSchema = zodToJsonSchema(schema, "mySchema");
		schemaDesc = JSON.stringify(jsonSchema, null, 2);
	} else {
		// 使用手动转换 (Good for simple cases & debugging)
		schemaDesc = manualZodToPrompt(schema);
	}

	console.log(`\n🔍 Schema Mode: ${useAutoConverter ? 'Auto (Lib)' : 'Manual (Hand-written)'}`);
	// console.log(`📜 Prompt Context:\n${schemaDesc.slice(0, 200)}... (truncated)\n`);

	const completion = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
		messages: [
			{
				role: 'system',
				content: `You are a strict Data Extraction AI.
Extract data and return JSON compatible with this schema:

${schemaDesc}

Return ONLY valid JSON.`,
			},
			{ role: 'user', content },
		],
		response_format: { type: 'json_object' },
		temperature: 0,
	});

	const result = completion.choices[0].message.content;
	if (!result) throw new Error('No content returned');

	// 🔥 Critical Step: Validation & Sanitization
	const cleanJson = result
		.replace(/```json/g, '')
		.replace(/```/g, '')
		.trim();

	try {
		const parsedJson = JSON.parse(cleanJson);
		return schema.parse(parsedJson);
	} catch (e) {
		console.error("🔥 Raw LLM Output that failed:", cleanJson);
		throw e;
	}
}

// --- Test Suite: Resume Parser ---

async function main() {
	const resumePath = path.join(__dirname, '../data/resume.txt');
	console.log(`📂 Reading file from: ${resumePath}`);

	let resumeText = "";
	try {
		// 注意：这里需要确保文件存在，我们之前已经写好了
		resumeText = await fs.readFile(resumePath, 'utf-8');
	} catch (e) {
		console.error("❌ File not found. Please ensure data/resume.txt exists.");
		console.error(e);
		return;
	}

	// 🔥 挑战：复杂嵌套结构 + 数组
	const ResumeSchema = z.object({
		candidate_name: z.string().describe("Full name of the candidate"),
		email: z.string().email().nullable().describe("Email address provided"),
		// Array 1: Simple String Array
		top_skills: z.array(z.string()).describe("Extract top 5 most important technical skills mentioned"),
		// Array 2: Object Array (Hard)
		work_experience: z.array(z.object({
			company: z.string(),
			role: z.string(),
			years_duration: z.number().describe("Approximated years worked there (e.g. 1.5)"),
			key_achievement: z.string().describe("A summary of their biggest win in one sentence")
		})).describe("List of work experiences"),
		// Calculated Field
		total_experience_years: z.number().describe("Sum of years of experience inferred from the timelines"),
		education: z.object({
			school: z.string(),
			degree: z.string()
		}).nullable()
	});

	try {
		console.log("🚀 Extracting structured data from Resume...");
		const startTime = Date.now();

		const data = await extractData(resumeText, ResumeSchema, true);

		const duration = Date.now() - startTime;
		console.log(`✅ Extraction Complete in ${duration}ms\n`);

		console.log(JSON.stringify(data, null, 2));

		// 演示类型安全访问
		console.log(`\nCandidate: ${data.candidate_name}`);
		console.log(`Top Skills: ${data.top_skills.join(", ")}`);

	} catch (e) {
		if (e instanceof z.ZodError) {
			console.error("🛑 Validation Failed:", JSON.stringify(e.issues, null, 2));
		} else {
			console.error("❌ System Error:", e);
		}
	}
}

if (require.main === module) {
	main();
}
