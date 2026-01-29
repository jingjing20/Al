import { capitalize, reverse, slugify } from './utils';

describe('utils', () => {
	describe('capitalize', () => {
		it('should capitalize the first letter', () => {
			expect(capitalize('hello')).toBe('Hello');
		});

		it('should return empty string for empty input', () => {
			expect(capitalize('')).toBe('');
		});
	});

	describe('reverse', () => {
		it('should reverse a string', () => {
			expect(reverse('hello')).toBe('olleh');
		});
	});

	describe('slugify', () => {
		it('should convert string to lowercase', () => {
			expect(slugify('HELLO World')).toBe('hello-world');
		});

		it('should replace spaces with hyphens', () => {
			expect(slugify('hello world')).toBe('hello-world');
			expect(slugify('hello   world')).toBe('hello-world');
		});

		it('should remove special characters', () => {
			expect(slugify('hello!@#$%^&*()world')).toBe('helloworld');
			expect(slugify('hello.world')).toBe('helloworld');
			expect(slugify('hello, world')).toBe('hello-world');
		});

		it('should handle accented characters', () => {
			expect(slugify('héllo wórld')).toBe('hllo-wrld');
		});

		it('should remove leading and trailing hyphens', () => {
			expect(slugify('-hello world-')).toBe('hello-world');
			expect(slugify('---hello world---')).toBe('hello-world');
		});

		it('should collapse multiple hyphens', () => {
			expect(slugify('hello--world')).toBe('hello-world');
			expect(slugify('hello---world')).toBe('hello-world');
		});

		it('should return empty string for empty input', () => {
			expect(slugify('')).toBe('');
		});

		it('should handle numbers', () => {
			expect(slugify('hello 123 world')).toBe('hello-123-world');
			expect(slugify('123-test')).toBe('123-test');
		});

		it('should handle complex strings', () => {
			expect(slugify('Hello World! This is a Test.')).toBe('hello-world-this-is-a-test');
			expect(slugify('Node.js & TypeScript: Best Practices')).toBe('nodejs-typescript-best-practices');
		});
	});
});
