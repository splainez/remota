export interface TestDir {
	path: string;
	mode?: string;
}

export interface TestFile {
	path: string;
	content: string;
	mode?: string;
}

export const TEST_DIRS: TestDir[] = [
	{ path: "readable" },
	{ path: "writable", mode: "755" },
	{ path: "nested/sub" },
];

export const TEST_FILES: TestFile[] = [
	{ path: "readable/hello.txt", content: "Hello World" },
	{ path: "nested/sub/deep.txt", content: "deep file" },
];

export function getFixtureContent(relativePath: string): string {
	const contents: Record<string, string> = {
		"readable/hello.txt": "Hello World",
		"nested/sub/deep.txt": "deep file",
	};
	return contents[relativePath] ?? "";
}

export function buildFileTreeCommands(basePath: string): string[] {
	return [
		`mkdir -p "${basePath}/readable" "${basePath}/writable" "${basePath}/nested/sub"`,
		`echo "Hello World" > "${basePath}/readable/hello.txt"`,
		`echo "deep file" > "${basePath}/nested/sub/deep.txt"`,
		`dd if=/dev/urandom of="${basePath}/binary.bin" bs=1024 count=1 2>/dev/null`,
		`dd if=/dev/urandom of="${basePath}/large.bin" bs=1024 count=1024 2>/dev/null`,
		`chmod 755 "${basePath}/writable"`,
		`chmod 644 "${basePath}/readable/hello.txt" "${basePath}/nested/sub/deep.txt"`,
	];
}

export function buildS3FixtureCommands(tmpDir: string): string[] {
	return [
		`mkdir -p "${tmpDir}/readable" "${tmpDir}/writable" "${tmpDir}/nested/sub"`,
		`echo "Hello World" > "${tmpDir}/readable/hello.txt"`,
		`echo "deep file" > "${tmpDir}/nested/sub/deep.txt"`,
		`dd if=/dev/urandom of="${tmpDir}/binary.bin" bs=1024 count=1 2>/dev/null`,
		`dd if=/dev/urandom of="${tmpDir}/large.bin" bs=1024 count=1024 2>/dev/null`,
	];
}
