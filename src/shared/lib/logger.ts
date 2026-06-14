import pino, { type LevelWithSilentOrString } from "pino";

const isProduction = process.env.NODE_ENV !== "development";
const defaultLevel = isProduction ? "info" : "debug";

const renameComponentBinding = (bindings: Record<string, unknown>) => {
	const component = bindings.component;
	if (component) {
		bindings.name = component;
		delete bindings.component;
	}

	return bindings;
};

export const rootLogger = pino({
	name: "Remota",
	level: defaultLevel,
	formatters: {
		log(obj) {
			if (typeof obj.name === "string") {
				obj._name = obj.name;
				delete obj.name;
			}

			return obj;
		},
		bindings: renameComponentBinding,
	},
	...(isProduction
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: { colorize: true },
				},
			}),
});

type LogFn = (msg: string, extra?: Record<string, unknown>) => void;

export interface Logger {
	fatal: LogFn;
	error: LogFn;
	warn: LogFn;
	info: LogFn;
	debug: LogFn;
	trace: LogFn;
	isLevelEnabled(level: LevelWithSilentOrString): boolean;
}

export const LoggerFactory = {
	init({ name }: { name: string }): Logger {
		return rootLogger.child({ component: name });
	},
};
