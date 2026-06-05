import type { Connection } from "@shared/types";

export function connectionSupportsTerminal(connection: Connection): boolean {
	return connection.protocol !== "s3";
}
