import { describe, it, expect } from "vitest";

import { LoggerFactory } from "./logger";

describe("LoggerFactory", () => {
	describe("init", () => {
		it("returns an object with all standard log level methods", () => {
			const log = LoggerFactory.init({ name: "test.service" });

			expect(log).toBeDefined();
			expect(typeof log.info).toBe("function");
			expect(typeof log.debug).toBe("function");
			expect(typeof log.warn).toBe("function");
			expect(typeof log.error).toBe("function");
			expect(typeof log.trace).toBe("function");
			expect(typeof log.fatal).toBe("function");
		});

		it("returns different logger instances for different names", () => {
			const a = LoggerFactory.init({ name: "service.a" });
			const b = LoggerFactory.init({ name: "service.b" });

			expect(a).not.toBe(b);
		});

		it("does not throw when calling log methods with a message", () => {
			const log = LoggerFactory.init({ name: "test.service" });

			expect(() => {
				log.info("test message");
			}).not.toThrow();
			expect(() => {
				log.debug("test message");
			}).not.toThrow();
			expect(() => {
				log.warn("test message");
			}).not.toThrow();
			expect(() => {
				log.error("test message");
			}).not.toThrow();
			expect(() => {
				log.trace("test message");
			}).not.toThrow();
			expect(() => {
				log.fatal("test message");
			}).not.toThrow();
		});

		it("accepts additional context as first argument", () => {
			const log = LoggerFactory.init({ name: "test.service" });

			expect(() => {
				log.info("test message", { key: "value" });
			}).not.toThrow();
			expect(() => {
				log.error("test", { error: new Error("test") });
			}).not.toThrow();
		});
	});
});
