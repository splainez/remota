export const SFTP_ERROR_CODES = [
	"CONNECTION_REFUSED",
	"CONNECTION_TIMEOUT",
	"AUTH_FAILED",
	"HOST_UNREACHABLE",
	"HOST_KEY_REJECTED",
	"PERMISSION_DENIED",
	"NOT_CONNECTED",
	"UNKNOWN",
] as const;

export type SftpErrorCode = (typeof SFTP_ERROR_CODES)[number];

export interface SftpErrorInfo {
	code: SftpErrorCode;
	technicalDetail: string;
}

const ERROR_MSG_KEYS: Record<SftpErrorCode, string> = {
	CONNECTION_REFUSED: "remote.error.connectionRefused",
	CONNECTION_TIMEOUT: "remote.error.connectionTimeout",
	AUTH_FAILED: "remote.error.authFailed",
	HOST_UNREACHABLE: "remote.error.hostUnreachable",
	HOST_KEY_REJECTED: "remote.error.hostKeyRejected",
	PERMISSION_DENIED: "remote.error.permissionDenied",
	NOT_CONNECTED: "remote.error.notConnected",
	UNKNOWN: "remote.error.unknown",
};

export function getErrorI18nKey(code: SftpErrorCode): string {
	return ERROR_MSG_KEYS[code];
}

export function classifyError(err: unknown): SftpErrorInfo {
	const msg = err instanceof Error ? err.message : String(err);

	if (msg.includes("Not connected")) {
		return { code: "NOT_CONNECTED", technicalDetail: msg };
	}
	if (
		msg.includes("Private key path is required") ||
		msg.includes("Connection with id")
	) {
		return {
			code: "UNKNOWN",
			technicalDetail: msg,
		};
	}

	const lower = msg.toLowerCase();

	if (
		lower.includes("refused") ||
		lower.includes("econnrefused") ||
		lower.includes("econnreset") ||
		lower.includes("econnaborted")
	) {
		return { code: "CONNECTION_REFUSED", technicalDetail: msg };
	}
	if (
		lower.includes("timed out") ||
		lower.includes("timeout") ||
		lower.includes("etimedout")
	) {
		return { code: "CONNECTION_TIMEOUT", technicalDetail: msg };
	}
	if (
		lower.includes("authentication") &&
		(lower.includes("failed") || lower.includes("fail"))
	) {
		return { code: "AUTH_FAILED", technicalDetail: msg };
	}
	if (lower.includes("host key") || lower.includes("fingerprint")) {
		return { code: "HOST_KEY_REJECTED", technicalDetail: msg };
	}
	if (
		lower.includes("enotfound") ||
		lower.includes("unreachable") ||
		lower.includes("resolve")
	) {
		return { code: "HOST_UNREACHABLE", technicalDetail: msg };
	}
	if (
		lower.includes("permission") ||
		lower.includes("access denied") ||
		lower.includes("access is denied")
	) {
		return { code: "PERMISSION_DENIED", technicalDetail: msg };
	}

	return { code: "UNKNOWN", technicalDetail: msg };
}
