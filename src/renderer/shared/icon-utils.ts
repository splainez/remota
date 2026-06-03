import type { IconName } from "@renderer/components/icons/icon-names";

const extensionMap: Record<string, IconName> = {
	".ts": "file-code",
	".tsx": "file-code",
	".js": "file-code",
	".jsx": "file-code",
	".mjs": "file-code",
	".cjs": "file-code",
	".json": "json",
	".md": "markdown",
	".mdx": "markdown",
	".css": "file-code",
	".scss": "file-code",
	".less": "file-code",
	".html": "file-code",
	".htm": "file-code",
	".xml": "file-code",
	".svg": "file-media",
	".png": "file-media",
	".jpg": "file-media",
	".jpeg": "file-media",
	".gif": "file-media",
	".webp": "file-media",
	".bmp": "file-media",
	".ico": "file-media",
	".pdf": "file-pdf",
	".zip": "file-zip",
	".tar": "file-zip",
	".gz": "file-zip",
	".rar": "file-zip",
	".7z": "file-zip",
	".bz2": "file-zip",
	".xz": "file-zip",
	".exe": "file-binary",
	".dll": "file-binary",
	".so": "file-binary",
	".dylib": "file-binary",
	".wasm": "file-binary",
	".ttf": "file",
	".woff": "file",
	".woff2": "file",
	".eot": "file",
	".lock": "file",
	".yaml": "file-code",
	".yml": "file-code",
	".toml": "file-code",
	".env": "file",
	".gitignore": "file",
	".editorconfig": "file",
	".eslintrc": "file-code",
	".prettierrc": "file-code",
	".sh": "file-code",
	".bash": "file-code",
	".zsh": "file-code",
	".ps1": "file-code",
	".py": "file-code",
	".rb": "file-code",
	".rs": "file-code",
	".go": "file-code",
	".java": "file-code",
	".kt": "file-code",
	".swift": "file-code",
	".c": "file-code",
	".cpp": "file-code",
	".h": "file-code",
	".hpp": "file-code",
	".sql": "file-code",
	".graphql": "file-code",
	".vue": "file-code",
	".svelte": "file-code",
};

const specialFiles: Record<string, IconName> = {
	"package.json": "package",
	"tsconfig.json": "file-code",
	dockerfile: "file-code",
	"docker-compose.yml": "file-code",
	"docker-compose.yaml": "file-code",
	license: "file",
	"license.md": "file",
	readme: "markdown",
	"readme.md": "markdown",
	"changelog.md": "markdown",
	"contributing.md": "markdown",
	".gitignore": "file",
	".gitattributes": "file",
	".editorconfig": "file",
	".env": "file",
	".env.local": "file",
	".env.example": "file",
	".npmrc": "file",
	".nvmrc": "file",
};

const folderNameMap: Record<string, IconName> = {
	node_modules: "folder-library",
	".git": "folder",
	".github": "folder",
	".vscode": "folder",
	".idea": "folder",
	src: "folder",
	lib: "folder",
	dist: "folder",
	build: "folder",
	public: "folder",
	static: "folder",
	assets: "folder",
	components: "folder",
	hooks: "folder",
	utils: "folder",
	helpers: "folder",
	services: "folder",
	store: "folder",
	pages: "folder",
	layouts: "folder",
	styles: "folder",
	tests: "folder",
	test: "folder",
	__tests__: "folder",
	docs: "folder",
	migrations: "folder",
	scripts: "folder",
	config: "folder",
};

function getExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1) return "";
	return filename.substring(lastDot).toLowerCase();
}

export function getFileIcon(filePath: string): IconName {
	const parts = filePath.replace(/\\/g, "/").split("/");
	const filename = parts[parts.length - 1];
	const lower = filename.toLowerCase();

	if (Object.hasOwn(specialFiles, lower)) {
		return specialFiles[lower];
	}

	const ext = getExtension(filename);
	if (Object.hasOwn(extensionMap, ext)) {
		return extensionMap[ext];
	}

	return "file";
}

export function getFolderIcon(folderPath: string): IconName {
	const parts = folderPath.replace(/\\/g, "/").split("/").filter(Boolean);
	if (parts.length === 0) return "folder";

	const name = parts[parts.length - 1].toLowerCase();

	if (Object.hasOwn(folderNameMap, name)) {
		return folderNameMap[name];
	}

	return "folder";
}
