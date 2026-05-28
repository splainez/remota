import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
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
	name: "OpenSCP",
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

export type Logger = pino.Logger;

export const LoggerFactory = {
	init({ name }: { name: string }): Logger {
		return rootLogger.child(
			{ component: name },
			{
				formatters: {
					bindings: renameComponentBinding,
				},
			},
		);
	},
};
